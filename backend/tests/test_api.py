from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_symbols():
    response = client.get("/api/symbols")
    assert response.status_code == 200
    assert "BTCUSD" in response.json()


def test_get_candles_default_timeframe():
    response = client.get("/api/candles/AAPL")
    assert response.status_code == 200
    body = response.json()
    assert len(body) > 0
    assert set(body[0].keys()) == {"timestamp", "open", "high", "low", "close", "volume"}


def test_get_candles_unknown_symbol_404s():
    response = client.get("/api/candles/NOTREAL")
    assert response.status_code == 404


def test_get_candles_unknown_timeframe_400s():
    response = client.get("/api/candles/AAPL?timeframe=3w")
    assert response.status_code == 400


def test_get_price():
    response = client.get("/api/price/TSLA")
    assert response.status_code == 200
    assert response.json()["symbol"] == "TSLA"


def test_submit_order_and_check_position_updates():
    response = client.post("/api/orders", json={"symbol": "ETHUSD", "side": "buy", "quantity": 1, "price": 3000})
    assert response.status_code == 200
    assert response.json()["status"] == "filled"

    position_response = client.get("/api/positions/ETHUSD")
    assert position_response.json()["quantity"] >= 1


def test_agent_feed_returns_signals():
    response = client.get("/api/agent-feed")
    assert response.status_code == 200
    body = response.json()
    assert len(body) >= 1
    assert "agent_type" in body[0]
