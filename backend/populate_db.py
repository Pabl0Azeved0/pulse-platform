import asyncio
from datetime import datetime
from sqlalchemy.future import select
from models import init_db, get_session, User, Post, Comment
from auth import get_password_hash

# 5 Users, all password 'pulse'
USERS_DATA = [
    {"username": "alice", "email": "alice@pulse.com", "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=alice"},
    {"username": "bob", "email": "bob@pulse.com", "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=bob"},
    {"username": "charlie", "email": "charlie@pulse.com", "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=charlie"},
    {"username": "dave", "email": "dave@pulse.com", "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=dave"},
    {"username": "eve", "email": "eve@pulse.com", "avatar": "https://api.dicebear.com/7.x/bottts/svg?seed=eve"},
]

async def populate():
    print("🌱 Starting Database Population...")
    
    # 1. Ensure DB tables exist
    await init_db()

    # 2. Get a DB Session
    # get_session is a generator, so we grab the first yielded session
    session_gen = get_session()
    session = await anext(session_gen)

    try:
        # --- Create Users ---
        print("👤 Creating Users...")
        # Pre-calculate hash since they all share the same password
        common_password_hash = get_password_hash("pulse")
        
        users_map = {}
        for u_data in USERS_DATA:
            # Check if user exists to avoid duplicates
            existing = (await session.execute(select(User).where(User.username == u_data["username"]))).scalars().first()
            if not existing:
                new_user = User(
                    username=u_data["username"],
                    email=u_data["email"],
                    password_hash=common_password_hash,
                    avatar=u_data["avatar"]
                )
                session.add(new_user)
                users_map[u_data["username"]] = new_user
            else:
                users_map[u_data["username"]] = existing
        
        await session.commit()
        # Refresh to get IDs
        for u in users_map.values(): await session.refresh(u)

        # --- Create Posts ---
        print("📝 Creating Posts...")
        
        # Alice posts about Python
        post1 = Post(content="Just deployed my first GraphQL API with Strawberry! 🍓 #python", user_id=users_map["alice"].id)
        # Dave posts about Coffee
        post2 = Post(content="Coffee is just a parser for caffeine. ☕", user_id=users_map["dave"].id)
        
        session.add_all([post1, post2])
        await session.commit()
        await session.refresh(post1)
        await session.refresh(post2)

        # --- Create Threaded Comments ---
        print("💬 Creating Threaded Comments...")

        # 1. Bob comments on Alice's post
        c1 = Comment(
            content="Congrats Alice! Is it using Async?", 
            user_id=users_map["bob"].id, 
            post_id=post1.id, 
            created_at=datetime.utcnow().isoformat()
        )
        session.add(c1)
        await session.commit()
        await session.refresh(c1)

        # 2. Charlie replies to Bob (Nested!)
        c2 = Comment(
            content="Of course it is, check the repo.", 
            user_id=users_map["charlie"].id, 
            post_id=post1.id,
            parent_id=c1.id, # <--- Link to Parent
            created_at=datetime.utcnow().isoformat()
        )
        session.add(c2)
        await session.commit()
        await session.refresh(c2)

        # 3. Eve replies to Charlie (Double Nested!)
        c3 = Comment(
            content="Can you share the link?", 
            user_id=users_map["eve"].id, 
            post_id=post1.id,
            parent_id=c2.id, # <--- Link to Parent
            created_at=datetime.utcnow().isoformat()
        )
        
        # 4. Eve comments on Dave's post (Top Level)
        c4 = Comment(
            content="True story.", 
            user_id=users_map["eve"].id, 
            post_id=post2.id,
            created_at=datetime.utcnow().isoformat()
        )

        session.add_all([c3, c4])
        await session.commit()

        print("✅ Database Populated Successfully!")

    except Exception as e:
        print(f"❌ Error: {e}")
        await session.rollback()
    finally:
        await session.close()

if __name__ == "__main__":
    asyncio.run(populate())
