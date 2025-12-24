import strawberry
from typing import List, Optional, AsyncGenerator
from datetime import datetime
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from models import get_session, User, Post, Like, Comment
from auth import get_password_hash, verify_password, create_access_token
from broadcaster import broadcaster


@strawberry.type
class UserType:
    id: int
    username: str
    email: str
    avatar: str | None
    bio: str | None
    created_at: str
    posts_count: int
    posts: List["PostType"]


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
    email: str
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


def format_user(user_db) -> UserType:
    return UserType(
        id=user_db.id,
        username=user_db.username,
        email=user_db.email,
        avatar=user_db.avatar,
        bio=user_db.bio,
        created_at=user_db.created_at or datetime.utcnow().isoformat(),
        posts_count=0,  # Populated only when needed
        posts=[],
    )


def format_comment_node(comment_db) -> CommentType:
    return CommentType(
        id=comment_db.id,
        content=comment_db.content,
        created_at=comment_db.created_at or datetime.utcnow().isoformat(),
        author=format_user(comment_db.author),
        replies=[],
        likes_count=0,
        is_liked=False,
    )


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def register(self, username: str, email: str, password: str) -> UserType:
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
    async def login(self, username: str, password: str) -> AuthPayload:
        async for session in get_session():
            query = select(User).where(User.username == username)
            user = (await session.execute(query)).scalars().first()
            if not user or not verify_password(password, user.password_hash):
                raise Exception("Invalid credentials")
            token = create_access_token({"sub": user.username})
            return AuthPayload(access_token=token, user=format_user(user))

    @strawberry.mutation
    async def create_post(self, username: str, content: str) -> PostType:
        async for session in get_session():
            q = select(User).where(User.username == username)
            user = (await session.execute(q)).scalars().first()
            if not user:
                raise Exception("User not found")

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
            await broadcaster.publish(post_response)
            return post_response

    @strawberry.mutation
    async def like_post(self, username: str, post_id: int) -> int:
        async for session in get_session():
            q_user = select(User).where(User.username == username)
            user = (await session.execute(q_user)).scalars().first()
            if not user:
                raise Exception("User not found")

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
    async def like_comment(self, username: str, comment_id: int) -> int:
        async for session in get_session():
            q_user = select(User).where(User.username == username)
            user = (await session.execute(q_user)).scalars().first()
            if not user:
                raise Exception("User not found")

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
        self, username: str, post_id: int, content: str, parent_id: Optional[int] = None
    ) -> CommentType:
        async for session in get_session():
            q_user = select(User).where(User.username == username)
            user = (await session.execute(q_user)).scalars().first()
            if not user:
                raise Exception("User not found")

            new_comment = Comment(
                content=content,
                user_id=user.id,
                post_id=post_id,
                parent_id=parent_id,
                created_at=datetime.utcnow().isoformat(),
            )
            session.add(new_comment)
            await session.commit()
            await session.refresh(new_comment)
            return format_comment_node(new_comment)

    @strawberry.mutation
    async def update_avatar(self, username: str, avatar_data: str) -> UserType:
        async for session in get_session():
            query = select(User).where(User.username == username)
            user = (await session.execute(query)).scalars().first()
            if not user:
                raise Exception("User not found")
            user.avatar = avatar_data
            await session.commit()
            return format_user(user)

    @strawberry.mutation
    async def update_profile(self, username: str, bio: str) -> UserType:
        async for session in get_session():
            query = select(User).where(User.username == username)
            user = (await session.execute(query)).scalars().first()

            if not user:
                raise Exception("User not found")

            user.bio = bio

            await session.commit()
            return format_user(user)

    @strawberry.mutation
    async def follow_user(self, username: str) -> bool:
        async for session in get_session():
            # 1. Get Viewer
            # (In a real app, you'd get the current user from context/token.
            # For this MVP we pass 'viewer' as an arg, OR strictly speaking,
            # we should get the current user from the request context.
            # To keep it consistent with your current code, let's assume we pass the viewer's username as an argument?
            # WAIT: Your current auth flow extracts user from token in 'login', but for mutations we usually need context.
            # Let's add a 'follower_username' argument to be explicit, matching your style).
            pass

    # Let's actually implement it matching your pattern (passing username explicitly)
    @strawberry.mutation
    async def follow_user(self, follower_username: str, target_username: str) -> bool:
        async for session in get_session():
            # Get Follower
            q_follower = select(User).where(User.username == follower_username)
            follower = (await session.execute(q_follower)).scalars().first()

            # Get Target
            q_target = select(User).where(User.username == target_username)
            target = (await session.execute(q_target)).scalars().first()

            if not follower or not target:
                raise Exception("User not found")
            if follower.id == target.id:
                raise Exception("Cannot follow yourself")

            # Check existence
            q_check = select(Follow).where(
                Follow.follower_id == follower.id, Follow.followed_id == target.id
            )
            existing = (await session.execute(q_check)).scalars().first()

            if not existing:
                new_follow = Follow(
                    follower_id=follower.id,
                    followed_id=target.id,
                    created_at=datetime.utcnow().isoformat(),
                )
                session.add(new_follow)
                await session.commit()
                return True
            return False

    @strawberry.mutation
    async def unfollow_user(self, follower_username: str, target_username: str) -> bool:
        async for session in get_session():
            q_follower = select(User).where(User.username == follower_username)
            follower = (await session.execute(q_follower)).scalars().first()

            q_target = select(User).where(User.username == target_username)
            target = (await session.execute(q_target)).scalars().first()

            if not follower or not target:
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


@strawberry.type
class Query:
    @strawberry.field
    async def posts(
        self, viewer: Optional[str] = None, filter_type: str = "GLOBAL"
    ) -> List[PostType]:
        async for session in get_session():
            viewer_id = None
            if viewer:
                u = (
                    (await session.execute(select(User).where(User.username == viewer)))
                    .scalars()
                    .first()
                )
                if u:
                    viewer_id = u.id

            query = select(Post).order_by(Post.id.desc())

            if filter_type == "FOLLOWING" and viewer_id:
                subquery = select(Follow.followed_id).where(
                    Follow.follower_id == viewer_id
                )
                query = query.where(Post.user_id.in_(subquery))

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

                # Fetch Comments
                c_query = (
                    select(Comment)
                    .where(Comment.post_id == p.id)
                    .options(selectinload(Comment.author))
                    .order_by(Comment.id.asc())
                )
                all_comments_db = (await session.execute(c_query)).scalars().all()

                # Likes for comments
                comment_ids = [c.id for c in all_comments_db]
                likes_map = {}
                user_liked_map = {}
                if comment_ids:
                    l_query = select(Like).where(Like.comment_id.in_(comment_ids))
                    all_likes = (await session.execute(l_query)).scalars().all()
                    for like in all_likes:
                        likes_map[like.comment_id] = (
                            likes_map.get(like.comment_id, 0) + 1
                        )
                        if viewer_id and like.user_id == viewer_id:
                            user_liked_map[like.comment_id] = True

                # Stitch Tree
                comment_map = {}
                for c_db in all_comments_db:
                    node = format_comment_node(c_db)
                    node.likes_count = likes_map.get(c_db.id, 0)
                    node.is_liked = user_liked_map.get(c_db.id, False)
                    comment_map[c_db.id] = node

                root_comments = []
                for c_db in all_comments_db:
                    node = comment_map[c_db.id]
                    if c_db.parent_id is None:
                        root_comments.append(node)
                    else:
                        parent_node = comment_map.get(c_db.parent_id)
                        if parent_node:
                            parent_node.replies.append(node)

                response_posts.append(
                    PostType(
                        id=p.id,
                        content=p.content,
                        likes_count=count,
                        is_liked=user_liked,
                        author=format_user(author),
                        comments=root_comments,
                    )
                )
            return response_posts

    @strawberry.field
    async def profile(
        self, username: str, viewer: Optional[str] = None
    ) -> Optional[UserProfileType]:
        async for session in get_session():
            q_user = select(User).where(User.username == username)
            user = (await session.execute(q_user)).scalars().first()
            if not user:
                return None

            viewer_id = None
            if viewer:
                v_u = (
                    (await session.execute(select(User).where(User.username == viewer)))
                    .scalars()
                    .first()
                )
                if v_u:
                    viewer_id = v_u.id

            # --- STATS LOGIC ---
            # 1. Followers Count
            q_followers = select(func.count(Follow.id)).where(
                Follow.followed_id == user.id
            )
            followers_count = (await session.execute(q_followers)).scalar() or 0

            # 2. Following Count
            q_following = select(func.count(Follow.id)).where(
                Follow.follower_id == user.id
            )
            following_count = (await session.execute(q_following)).scalar() or 0

            # 3. Is Viewer Following?
            is_following = False
            if viewer_id:
                q_check = select(Follow).where(
                    Follow.follower_id == viewer_id, Follow.followed_id == user.id
                )
                check = (await session.execute(q_check)).scalars().first()
                if check:
                    is_following = True
            # -------------------

            # Get Posts (Existing Logic)
            p_query = (
                select(Post).where(Post.user_id == user.id).order_by(Post.id.desc())
            )
            posts_db = (await session.execute(p_query)).scalars().all()

            formatted_posts = []
            for p in posts_db:
                # ... (Keep existing post formatting logic) ...
                # Copy the logic from your current schema.py for calculating likes etc
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

                formatted_posts.append(
                    PostType(
                        id=p.id,
                        content=p.content,
                        likes_count=count,
                        is_liked=user_liked,
                        author=format_user(user),
                        comments=[],
                    )
                )

            return UserProfileType(
                id=user.id,
                username=user.username,
                email=user.email,
                avatar=user.avatar,
                bio=user.bio,
                created_at=user.created_at or datetime.utcnow().isoformat(),
                posts_count=len(formatted_posts),
                # Populate new fields
                followers_count=followers_count,
                following_count=following_count,
                is_following=is_following,
                posts=formatted_posts,
            )

    @strawberry.field
    async def search(self, query: str, viewer: Optional[str] = None) -> SearchResults:
        async for session in get_session():
            if not query or len(query.strip()) < 2:
                return SearchResults(users=[], posts=[])

            clean_query = f"%{query}%"

            u_query = select(User).where(User.username.ilike(clean_query)).limit(10)
            users_db = (await session.execute(u_query)).scalars().all()
            formatted_users = [format_user(u) for u in users_db]

            p_query = (
                select(Post)
                .where(Post.content.ilike(clean_query))
                .order_by(Post.id.desc())
                .limit(20)
            )
            posts_db = (await session.execute(p_query)).scalars().all()

            viewer_id = None
            if viewer:
                v = (
                    (await session.execute(select(User).where(User.username == viewer)))
                    .scalars()
                    .first()
                )
                if v:
                    viewer_id = v.id

            formatted_posts = []
            for p in posts_db:
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

                formatted_posts.append(
                    PostType(
                        id=p.id,
                        content=p.content,
                        likes_count=count,
                        is_liked=user_liked,
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
        async for post in broadcaster.subscribe():
            yield post


schema = strawberry.Schema(query=Query, mutation=Mutation, subscription=Subscription)
