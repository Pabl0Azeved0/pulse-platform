import pytest

REGISTER_MUTATION = """
    mutation Register($username: String!, $email: String!, $password: String!) {
        register(username: $username, email: $email, password: $password) {
            username
            email
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