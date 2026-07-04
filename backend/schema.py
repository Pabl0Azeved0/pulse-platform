import os
import json
import strawberry, jwt
from jose import jwt, JWTError
from typing import List, Optional, AsyncGenerator
from datetime import datetime, timezone
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from strawberry.types import Info

from models import get_session, User, Post, Like, Comment, Follow
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    ALGORITHM,
    SECRET_KEY,
    DUMMY_PASSWORD_HASH,
)
from events import broadcaster
from rate_limit import rate_limiter, client_ip
from constants import Schema, RateLimit
from strawberry.extensions import (
    QueryDepthLimiter,
    AddValidationRules,
    MaxAliasesLimiter,
)
from graphql.validation import NoSchemaIntrospectionCustomRule


def _validate_length(value, max_length: int, field: str):
    if value is not None and len(value) > max_length:
        raise Exception(f"{field} exceeds maximum length of {max_length} characters.")
    return value


@strawberry.type
class UserType:
    id: int
    username: str
    avatar: str | None
    bio: str | None
    created_at: str
    posts_count: int
    posts: List["PostType"]
    is_following: bool


@strawberry.type
class CommentType:
    id: int
    content: str
    created_at: str
    author: UserType
    replies: List["CommentType"]
    likes_count: int
    is_liked: bool


@strawberry.type
class PostType:
    id: int
    content: str
    author: UserType
    likes_count: int
    is_liked: bool
    comments: List[CommentType]


@strawberry.type
class UserProfileType:
    id: int
    username: str
    avatar: str | None
    bio: str | None
    created_at: str
    posts_count: int
    followers_count: int
    following_count: int
    is_following: bool
    posts: List[PostType]


@strawberry.type
class AuthPayload:
    access_token: str
    token_type: str = "bearer"
    user: UserType


@strawberry.type
class SearchResults:
    users: List[UserType]
    posts: List[PostType]


# --- HELPERS ---


async def get_user_from_request(request) -> Optional[User]:
    """Verify the JWT on a Starlette request and return the matching user, or None."""
    if not request:
        return None

    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None

    try:
        scheme, token = auth_header.split()
        if scheme.lower() != "bearer":
            return None

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            return None

        async for session in get_session():
            stmt = select(User).where(User.username == username)
            return (await session.execute(stmt)).scalars().first()
    except JWTError:
        return None
    except Exception:
        return None


async def get_current_user(info: Info) -> Optional[User]:
    """Extract the authenticated user from the GraphQL request context."""
    return await get_user_from_request(info.context.get("request"))


def format_user(user_db, viewer_id: Optional[int] = None) -> UserType:
    # Logic to check if viewer follows this user
    is_following = False
    # Check if 'followers' is loaded to prevent lazy load errors in async
    if viewer_id and hasattr(user_db, "followers") and user_db.followers:
        for f in user_db.followers:
            if f.follower_id == viewer_id:
                is_following = True
                break

    return UserType(
        id=user_db.id,
        username=user_db.username,
        avatar=user_db.avatar,
        bio=user_db.bio,
        created_at=user_db.created_at or datetime.now(timezone.utc).isoformat(),
        posts_count=0,  # Populated only when needed
        posts=[],
        is_following=is_following,
    )


def format_comment_node(comment_db) -> CommentType:
    return CommentType(
        id=comment_db.id,
        content=comment_db.content,
        created_at=comment_db.created_at or datetime.now(timezone.utc).isoformat(),
        author=format_user(comment_db.author),
        replies=[],
        likes_count=0,
        is_liked=False,
    )


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def register(
        self, info: Info, username: str, email: str, password: str
    ) -> UserType:
        request = info.context.get("request")
        if not rate_limiter.is_allowed(
            f"register:{client_ip(request)}", *RateLimit.REGISTER
        ):
            raise Exception("Too many registration attempts. Please try again later.")

        _validate_length(username, Schema.USERNAME_MAX_LENGTH, "Username")
        _validate_length(email, Schema.EMAIL_MAX_LENGTH, "Email")
        if not password or not (
            Schema.PASSWORD_MIN_LENGTH <= len(password) <= Schema.PASSWORD_MAX_LENGTH
        ):
            raise Exception(
                f"Password must be between {Schema.PASSWORD_MIN_LENGTH} and "
                f"{Schema.PASSWORD_MAX_LENGTH} characters."
            )

        async for session in get_session():
            hashed_pw = get_password_hash(password)
            new_user = User(username=username, email=email, password_hash=hashed_pw)
            try:
                session.add(new_user)
                await session.commit()
                await session.refresh(new_user)
                return format_user(new_user)
            except Exception:
                await session.rollback()
                raise Exception("Username or email already taken.")

    @strawberry.mutation
    async def login(self, info: Info, username: str, password: str) -> AuthPayload:
        request = info.context.get("request")
        if not rate_limiter.is_allowed(f"login:{client_ip(request)}", *RateLimit.LOGIN):
            raise Exception("Too many login attempts. Please try again later.")

        async for session in get_session():
            query = select(User).where(User.username == username)
            user = (await session.execute(query)).scalars().first()
            if not user:
                # Run a verify against a constant hash so response time does not
                # reveal whether the username exists (timing user-enumeration).
                verify_password(password, DUMMY_PASSWORD_HASH)
                raise Exception("Invalid credentials")
            if not verify_password(password, user.password_hash):
                raise Exception("Invalid credentials")
            token = create_access_token({"sub": user.username})
            return AuthPayload(access_token=token, user=format_user(user))

    @strawberry.mutation
    async def create_post(self, info: Info, content: str) -> PostType:
        user = await get_current_user(info)
        if not user:
            raise Exception("Not authenticated")
        _validate_length(content, Schema.MAX_CONTENT_LENGTH, "Post content")

        async for session in get_session():
            new_post = Post(content=content, user_id=user.id)
            session.add(new_post)
            await session.commit()
            await session.refresh(new_post)

            post_response = PostType(
                id=new_post.id,
                content=new_post.content,
                likes_count=0,
                is_liked=False,
                author=format_user(user),
                comments=[],
            )
            # Publish a serializable payload (Redis carries strings, not objects).
            await broadcaster.publish(
                channel=Schema.NEW_POSTS_CHANNEL,
                message=json.dumps(
                    {
                        "id": new_post.id,
                        "content": new_post.content,
                        "author_username": user.username,
                        "author_avatar": user.avatar,
                    }
                ),
            )
            return post_response

    @strawberry.mutation
    async def like_post(self, info: Info, post_id: int) -> int:
        user = await get_current_user(info)
        if not user:
            raise Exception("Not authenticated")

        async for session in get_session():
            q_like = select(Like).where(
                Like.user_id == user.id, Like.post_id == post_id
            )
            existing_like = (await session.execute(q_like)).scalars().first()

            if existing_like:
                await session.delete(existing_like)
            else:
                session.add(Like(user_id=user.id, post_id=post_id))
            await session.commit()

            q_count = select(func.count(Like.id)).where(Like.post_id == post_id)
            return (await session.execute(q_count)).scalar() or 0

    @strawberry.mutation
    async def like_comment(self, info: Info, comment_id: int) -> int:
        user = await get_current_user(info)
        if not user:
            raise Exception("Not authenticated")

        async for session in get_session():
            q_like = select(Like).where(
                Like.user_id == user.id, Like.comment_id == comment_id
            )
            existing_like = (await session.execute(q_like)).scalars().first()

            if existing_like:
                await session.delete(existing_like)
            else:
                session.add(Like(user_id=user.id, comment_id=comment_id))
            await session.commit()

            q_count = select(func.count(Like.id)).where(Like.comment_id == comment_id)
            return (await session.execute(q_count)).scalar() or 0

    @strawberry.mutation
    async def create_comment(
        self, info: Info, post_id: int, content: str, parent_id: Optional[int] = None
    ) -> CommentType:
        user = await get_current_user(info)
        if not user:
            raise Exception("Not authenticated")
        _validate_length(content, Schema.MAX_CONTENT_LENGTH, "Comment content")

        async for session in get_session():
            post = (
                (await session.execute(select(Post).where(Post.id == post_id)))
                .scalars()
                .first()
            )
            if not post:
                raise Exception("Post not found")
            if parent_id is not None:
                parent = (
                    (
                        await session.execute(
                            select(Comment).where(Comment.id == parent_id)
                        )
                    )
                    .scalars()
                    .first()
                )
                if not parent or parent.post_id != post_id:
                    raise Exception("Invalid parent comment")

            new_comment = Comment(
                content=content,
                user_id=user.id,
                post_id=post_id,
                parent_id=parent_id,
                created_at=datetime.now(timezone.utc).isoformat(),
            )
            session.add(new_comment)
            await session.commit()
            await session.refresh(new_comment)
            return format_comment_node(new_comment)

    @strawberry.mutation
    async def update_avatar(self, info: Info, avatar_data: str) -> UserType:
        user = await get_current_user(info)
        if not user:
            raise Exception("Not authenticated")
        _validate_length(avatar_data, Schema.MAX_AVATAR_LENGTH, "Avatar")

        async for session in get_session():
            query = select(User).where(User.id == user.id)
            db_user = (await session.execute(query)).scalars().first()
            if not db_user:
                raise Exception("User not found")
            db_user.avatar = avatar_data
            await session.commit()
            return format_user(db_user)

    @strawberry.mutation
    async def update_profile(self, info: Info, bio: str) -> UserType:
        user = await get_current_user(info)
        if not user:
            raise Exception("Not authenticated")
        _validate_length(bio, Schema.MAX_BIO_LENGTH, "Bio")

        async for session in get_session():
            query = select(User).where(User.id == user.id)
            db_user = (await session.execute(query)).scalars().first()
            if not db_user:
                raise Exception("User not found")
            db_user.bio = bio
            await session.commit()
            return format_user(db_user)

    @strawberry.mutation
    async def follow_user(self, info: Info, target_username: str) -> bool:
        follower = await get_current_user(info)
        if not follower:
            raise Exception("Not authenticated")

        async for session in get_session():
            q_target = select(User).where(User.username == target_username)
            target = (await session.execute(q_target)).scalars().first()

            if not target:
                raise Exception("User not found")
            if follower.id == target.id:
                raise Exception("Cannot follow yourself")

            q_check = select(Follow).where(
                Follow.follower_id == follower.id, Follow.followed_id == target.id
            )
            existing = (await session.execute(q_check)).scalars().first()

            if not existing:
                new_follow = Follow(
                    follower_id=follower.id,
                    followed_id=target.id,
                    created_at=datetime.now(timezone.utc).isoformat(),
                )
                session.add(new_follow)
                await session.commit()
                return True
            return False

    @strawberry.mutation
    async def unfollow_user(self, info: Info, target_username: str) -> bool:
        follower = await get_current_user(info)
        if not follower:
            raise Exception("Not authenticated")

        async for session in get_session():
            q_target = select(User).where(User.username == target_username)
            target = (await session.execute(q_target)).scalars().first()

            if not target:
                raise Exception("User not found")

            q_check = select(Follow).where(
                Follow.follower_id == follower.id, Follow.followed_id == target.id
            )
            existing = (await session.execute(q_check)).scalars().first()

            if existing:
                await session.delete(existing)
                await session.commit()
                return True
            return False

    @strawberry.mutation
    async def update_user(
        self, info: Info, bio: Optional[str] = None, avatar: Optional[str] = None
    ) -> UserType:
        # 1. Authenticate via Token (Secure)
        user = await get_current_user(info)
        if not user:
            raise Exception("Not authenticated")
        _validate_length(bio, Schema.MAX_BIO_LENGTH, "Bio")
        _validate_length(avatar, Schema.MAX_AVATAR_LENGTH, "Avatar")

        # 2. Update DB
        async for session in get_session():
            # Re-fetch user within this session to ensure attachment
            db_user = (
                (await session.execute(select(User).where(User.id == user.id)))
                .scalars()
                .first()
            )

            if not db_user:
                raise Exception("User not found")

            if bio is not None:
                db_user.bio = bio
            if avatar is not None:
                db_user.avatar = avatar

            await session.commit()
            await session.refresh(db_user)

            return format_user(db_user)


@strawberry.type
class Query:
    @strawberry.field
    async def posts(
        self,
        info: Info,
        filter_type: str = "GLOBAL",
        limit: int = Schema.DEFAULT_PAGE_SIZE,
        offset: int = 0,
    ) -> List[PostType]:
        current_user = await get_current_user(info)
        async for session in get_session():
            viewer_id = current_user.id if current_user else None

            # Clamp pagination so one request can't pull the whole table.
            limit = max(1, min(limit, Schema.MAX_PAGE_SIZE))
            offset = max(0, offset)

            query = select(Post).order_by(Post.id.desc())

            if filter_type == "FOLLOWING" and viewer_id:
                subquery = select(Follow.followed_id).where(
                    Follow.follower_id == viewer_id
                )
                query = query.where(Post.user_id.in_(subquery))

            query = query.limit(limit).offset(offset)

            posts_list = (await session.execute(query)).scalars().all()

            response_posts = []
            for p in posts_list:
                author = (
                    (await session.execute(select(User).where(User.id == p.user_id)))
                    .scalars()
                    .first()
                )

                count = (
                    await session.execute(
                        select(func.count(Like.id)).where(Like.post_id == p.id)
                    )
                ).scalar() or 0

                user_liked = False
                if viewer_id:
                    check = (
                        (
                            await session.execute(
                                select(Like).where(
                                    Like.user_id == viewer_id, Like.post_id == p.id
                                )
                            )
                        )
                        .scalars()
                        .first()
                    )
                    if check:
                        user_liked = True

                c_query = (
                    select(Comment)
                    .where(Comment.post_id == p.id)
                    .options(selectinload(Comment.author))
                    .order_by(Comment.id.asc())
                )
                all_comments_db = (await session.execute(c_query)).scalars().all()

                # Basic Comment stitching logic (simplified from your snippet)
                formatted_comments = [
                    format_comment_node(c)
                    for c in all_comments_db
                    if c.parent_id is None
                ]

                response_posts.append(
                    PostType(
                        id=p.id,
                        content=p.content,
                        likes_count=count,
                        is_liked=user_liked,
                        author=format_user(author, viewer_id),
                        comments=formatted_comments,
                    )
                )
            return response_posts

    @strawberry.field
    async def profile(self, info: Info, username: str) -> Optional[UserProfileType]:
        current_user = await get_current_user(info)
        async for session in get_session():
            q_user = select(User).where(User.username == username)
            user = (await session.execute(q_user)).scalars().first()
            if not user:
                return None

            viewer_id = current_user.id if current_user else None

            q_followers = select(func.count(Follow.id)).where(
                Follow.followed_id == user.id
            )
            followers_count = (await session.execute(q_followers)).scalar() or 0

            q_following = select(func.count(Follow.id)).where(
                Follow.follower_id == user.id
            )
            following_count = (await session.execute(q_following)).scalar() or 0

            is_following = False
            if viewer_id:
                q_check = select(Follow).where(
                    Follow.follower_id == viewer_id, Follow.followed_id == user.id
                )
                check = (await session.execute(q_check)).scalars().first()
                if check:
                    is_following = True

            p_query = (
                select(Post).where(Post.user_id == user.id).order_by(Post.id.desc())
            )
            posts_db = (await session.execute(p_query)).scalars().all()

            formatted_posts = []
            for p in posts_db:
                formatted_posts.append(
                    PostType(
                        id=p.id,
                        content=p.content,
                        likes_count=0,  # Simplified for profile view
                        is_liked=False,
                        author=format_user(user),  # No viewer needed for author
                        comments=[],
                    )
                )

            return UserProfileType(
                id=user.id,
                username=user.username,
                avatar=user.avatar,
                bio=user.bio,
                created_at=user.created_at or datetime.now(timezone.utc).isoformat(),
                posts_count=len(formatted_posts),
                followers_count=followers_count,
                following_count=following_count,
                is_following=is_following,
                posts=formatted_posts,
            )

    @strawberry.field
    async def search(self, info: Info, query: str) -> SearchResults:
        current_user = await get_current_user(info)
        async for session in get_session():
            if not query or len(query.strip()) < 2:
                return SearchResults(users=[], posts=[])

            clean_query = f"%{query}%"
            viewer_id = current_user.id if current_user else None

            # USERS SEARCH - Modified to load followers for the 'is_following' check
            u_query = (
                select(User)
                .where(User.username.ilike(clean_query))
                .options(
                    selectinload(User.followers)
                )  # Load followers to check relationship
                .limit(10)
            )
            users_db = (await session.execute(u_query)).scalars().all()
            formatted_users = [format_user(u, viewer_id) for u in users_db]

            # POSTS SEARCH
            p_query = (
                select(Post)
                .where(Post.content.ilike(clean_query))
                .order_by(Post.id.desc())
                .limit(20)
            )
            posts_db = (await session.execute(p_query)).scalars().all()

            formatted_posts = []
            for p in posts_db:
                author = (
                    (await session.execute(select(User).where(User.id == p.user_id)))
                    .scalars()
                    .first()
                )
                formatted_posts.append(
                    PostType(
                        id=p.id,
                        content=p.content,
                        likes_count=0,
                        is_liked=False,
                        author=format_user(author),
                        comments=[],
                    )
                )

            return SearchResults(users=formatted_users, posts=formatted_posts)


# --- SUBSCRIPTION ---


@strawberry.type
class Subscription:
    @strawberry.subscription
    async def new_post(self) -> AsyncGenerator[PostType, None]:
        async with broadcaster.subscribe(
            channel=Schema.NEW_POSTS_CHANNEL
        ) as subscriber:
            async for event in subscriber:
                data = json.loads(event.message)
                author = UserType(
                    id=0,
                    username=data["author_username"],
                    avatar=data.get("author_avatar"),
                    bio=None,
                    created_at="",
                    posts_count=0,
                    posts=[],
                    is_following=False,
                )
                yield PostType(
                    id=data["id"],
                    content=data["content"],
                    likes_count=0,
                    is_liked=False,
                    author=author,
                    comments=[],
                )


def build_schema(production: bool = False) -> strawberry.Schema:
    extensions = [
        QueryDepthLimiter(max_depth=Schema.MAX_QUERY_DEPTH),
        MaxAliasesLimiter(max_alias_count=Schema.MAX_ALIASES),
    ]
    if production:
        # Disable schema introspection in production.
        extensions.append(AddValidationRules([NoSchemaIntrospectionCustomRule]))
    return strawberry.Schema(
        query=Query,
        mutation=Mutation,
        subscription=Subscription,
        extensions=extensions,
    )


IS_PRODUCTION = os.getenv("ENV", "development").lower() == "production"
schema = build_schema(production=IS_PRODUCTION)
