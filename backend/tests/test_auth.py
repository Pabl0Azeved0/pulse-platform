import pytest
from unittest.mock import patch, AsyncMock

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
            user {
                username
            }
        }
    }
"""

CREATE_POST_MUTATION = """
    mutation($content: String!) {
        createPost(content: $content) {
            id
            content
            author {
                username
            }
        }
    }
"""

@pytest.mark.asyncio
async def test_register_and_login(client):
    # 1. Test Registration
    reg_response = await client.post("/graphql", json={
        "query": REGISTER_MUTATION,
        "variables": {
            "username": "testuser",
            "email": "test@example.com",
            "password": "strongpassword123"
        }
    })
    
    assert reg_response.status_code == 200
    data = reg_response.json()
    
    if "errors" in data:
        pytest.fail(f"Register Error: {data['errors']}")
        
    assert data["data"]["register"]["username"] == "testuser"

    # 2. Test Login
    login_response = await client.post("/graphql", json={
        "query": LOGIN_MUTATION,
        "variables": {
            "username": "testuser",
            "password": "strongpassword123"
        }
    })
    
    assert login_response.status_code == 200
    login_data = login_response.json()
    
    if "errors" in login_data:
        pytest.fail(f"Login Error: {login_data['errors']}")

    assert "accessToken" in login_data["data"]["login"]


@pytest.mark.asyncio
async def test_create_post_requires_auth(client):
    # 1. Register + Login to obtain a token
    await client.post("/graphql", json={
        "query": REGISTER_MUTATION,
        "variables": {
            "username": "postuser",
            "email": "postuser@example.com",
            "password": "strongpassword123"
        }
    })

    login_response = await client.post("/graphql", json={
        "query": LOGIN_MUTATION,
        "variables": {
            "username": "postuser",
            "password": "strongpassword123"
        }
    })
    token = login_response.json()["data"]["login"]["accessToken"]

    # 2. With a valid token, createPost should succeed
    with patch("schema.broadcaster.publish", new=AsyncMock()):
        authed_response = await client.post(
            "/graphql",
            json={"query": CREATE_POST_MUTATION, "variables": {"content": "hello"}},
            headers={"Authorization": f"Bearer {token}"},
        )
    assert authed_response.status_code == 200
    authed_data = authed_response.json()

    if "errors" in authed_data:
        pytest.fail(f"CreatePost Error: {authed_data['errors']}")

    assert authed_data["data"]["createPost"]["content"] == "hello"

    # 3. Without the Authorization header, createPost should be rejected
    unauthed_response = await client.post(
        "/graphql",
        json={"query": CREATE_POST_MUTATION, "variables": {"content": "hello"}},
    )
    unauthed_data = unauthed_response.json()

    assert "errors" in unauthed_data or unauthed_data["data"] is None