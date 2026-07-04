import pytest
from unittest.mock import patch, AsyncMock
from jose import jwt

REGISTER_MUTATION = """
    mutation Register($username: String!, $email: String!, $password: String!) {
        register(username: $username, email: $email, password: $password) {
            username
        }
    }
"""

LOGIN_MUTATION = """
    mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
            accessToken
        }
    }
"""

CREATE_POST_MUTATION = """
    mutation($content: String!) {
        createPost(content: $content) { id content }
    }
"""


async def _register_and_login(client, username="secuser"):
    await client.post(
        "/graphql",
        json={
            "query": REGISTER_MUTATION,
            "variables": {
                "username": username,
                "email": f"{username}@example.com",
                "password": "strongpassword123",
            },
        },
    )
    resp = await client.post(
        "/graphql",
        json={
            "query": LOGIN_MUTATION,
            "variables": {"username": username, "password": "strongpassword123"},
        },
    )
    return resp.json()["data"]["login"]["accessToken"]


@pytest.mark.asyncio
async def test_login_is_rate_limited(client):
    # Register a real user so early attempts are genuine (wrong password).
    await client.post(
        "/graphql",
        json={
            "query": REGISTER_MUTATION,
            "variables": {
                "username": "brute",
                "email": "brute@example.com",
                "password": "strongpassword123",
            },
        },
    )
    last_error = ""
    for _ in range(7):
        resp = await client.post(
            "/graphql",
            json={
                "query": LOGIN_MUTATION,
                "variables": {"username": "brute", "password": "wrong"},
            },
        )
        data = resp.json()
        if "errors" in data:
            last_error = data["errors"][0]["message"]
    assert "Too many login attempts" in last_error


@pytest.mark.asyncio
async def test_register_is_rate_limited(client):
    last_error = ""
    for i in range(7):
        resp = await client.post(
            "/graphql",
            json={
                "query": REGISTER_MUTATION,
                "variables": {
                    "username": f"reg{i}",
                    "email": f"reg{i}@example.com",
                    "password": "strongpassword123",
                },
            },
        )
        data = resp.json()
        if "errors" in data:
            last_error = data["errors"][0]["message"]
    assert "Too many registration attempts" in last_error


@pytest.mark.asyncio
async def test_upload_requires_auth(client):
    resp = await client.post(
        "/upload", files={"file": ("x.png", b"fakepng", "image/png")}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_upload_rejects_non_image(client):
    token = await _register_and_login(client, "uploader1")
    resp = await client.post(
        "/upload",
        files={"file": ("evil.html", b"<script>alert(1)</script>", "text/html")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_upload_rejects_oversize(client):
    token = await _register_and_login(client, "uploader2")
    big = b"0" * (5 * 1024 * 1024 + 1)
    resp = await client.post(
        "/upload",
        files={"file": ("big.png", big, "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 413


@pytest.mark.asyncio
async def test_upload_accepts_valid_image(client):
    token = await _register_and_login(client, "uploader3")
    resp = await client.post(
        "/upload",
        files={"file": ("ok.png", b"small-png-bytes", "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    assert resp.json()["url"].endswith(".png")


@pytest.mark.asyncio
async def test_post_content_length_enforced(client):
    token = await _register_and_login(client, "longpost")
    with patch("schema.broadcaster.publish", new=AsyncMock()):
        resp = await client.post(
            "/graphql",
            json={"query": CREATE_POST_MUTATION, "variables": {"content": "x" * 5001}},
            headers={"Authorization": f"Bearer {token}"},
        )
    data = resp.json()
    assert "errors" in data
    assert "maximum length" in data["errors"][0]["message"]


@pytest.mark.asyncio
async def test_posts_query_rejects_viewer_argument(client):
    # The `viewer` argument was removed; identity now comes from the token.
    resp = await client.post(
        "/graphql",
        json={"query": "query { posts(viewer: \"attacker\") { id } }"},
    )
    data = resp.json()
    assert "errors" in data


@pytest.mark.asyncio
async def test_forged_token_with_default_secret_rejected(client):
    # A token signed with the old hard-coded default must NOT be accepted.
    forged = jwt.encode({"sub": "brute"}, "super_secret_key", algorithm="HS256")
    with patch("schema.broadcaster.publish", new=AsyncMock()):
        resp = await client.post(
            "/graphql",
            json={"query": CREATE_POST_MUTATION, "variables": {"content": "hi"}},
            headers={"Authorization": f"Bearer {forged}"},
        )
    data = resp.json()
    assert "errors" in data or data["data"] is None


@pytest.mark.asyncio
async def test_query_depth_is_limited(client):
    body = "id"
    for _ in range(8):  # 16 levels deep, exceeds max_depth=12
        body = f"posts {{ author {{ {body} }} }}"
    resp = await client.post("/graphql", json={"query": f"query {{ {body} }}"})
    data = resp.json()
    assert "errors" in data


@pytest.mark.asyncio
async def test_email_not_exposed_in_output(client):
    # Finding A: email was removed from public output types; selecting it must error.
    await client.post(
        "/graphql",
        json={
            "query": REGISTER_MUTATION,
            "variables": {
                "username": "pii",
                "email": "pii@secret.com",
                "password": "strongpassword123",
            },
        },
    )
    resp = await client.post(
        "/graphql",
        json={"query": 'query { search(query:"pii"){ users { username email } } }'},
    )
    assert "errors" in resp.json()


@pytest.mark.asyncio
async def test_login_runs_dummy_verify_for_unknown_user(client):
    # Finding C: an unknown username must still trigger a password verify so
    # timing does not reveal whether the account exists.
    with patch("schema.verify_password", return_value=False) as mock_verify:
        await client.post(
            "/graphql",
            json={
                "query": LOGIN_MUTATION,
                "variables": {"username": "does-not-exist", "password": "whatever"},
            },
        )
    assert mock_verify.called


def test_introspection_disabled_in_production():
    # Finding D: introspection is blocked when the schema is built for production.
    from schema import build_schema

    prod = build_schema(production=True)
    assert prod.execute_sync("{ __schema { types { name } } }").errors
    dev = build_schema(production=False)
    assert dev.execute_sync("{ __schema { types { name } } }").errors is None


@pytest.mark.asyncio
async def test_comment_requires_existing_post(client):
    # Finding E: commenting on a non-existent post must be rejected.
    token = await _register_and_login(client, "commentsec")
    mutation = "mutation($pid:Int!,$c:String!){createComment(postId:$pid,content:$c){id}}"
    resp = await client.post(
        "/graphql",
        json={"query": mutation, "variables": {"pid": 99999, "c": "ghost"}},
        headers={"Authorization": f"Bearer {token}"},
    )
    data = resp.json()
    assert "errors" in data
    assert "Post not found" in data["errors"][0]["message"]


@pytest.mark.asyncio
async def test_alias_amplification_blocked(client):
    # Finding B: many aliases of an expensive resolver in one request are rejected.
    aliases = " ".join(f"a{i}: posts {{ id }}" for i in range(20))
    resp = await client.post("/graphql", json={"query": f"query {{ {aliases} }}"})
    assert "errors" in resp.json()


@pytest.mark.asyncio
async def test_posts_pagination_limit(client):
    # Finding B: the feed is bounded — limit caps the rows returned.
    token = await _register_and_login(client, "pager")
    with patch("schema.broadcaster.publish", new=AsyncMock()):
        for i in range(3):
            await client.post(
                "/graphql",
                json={
                    "query": CREATE_POST_MUTATION,
                    "variables": {"content": f"p{i}"},
                },
                headers={"Authorization": f"Bearer {token}"},
            )
    resp = await client.post(
        "/graphql", json={"query": "query { posts(limit: 2) { id } }"}
    )
    data = resp.json()
    assert "errors" not in data
    assert len(data["data"]["posts"]) == 2
