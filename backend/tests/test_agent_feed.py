from app.agent_feed import AgentFeed, AGENT_TYPES
from app.market_data import SYMBOLS


def test_generate_signal_has_valid_fields():
    feed = AgentFeed(seed=0)
    signal = feed.generate_signal(now=100.0)
    assert signal.agent_type in AGENT_TYPES
    assert signal.symbol in SYMBOLS
    assert signal.symbol in signal.message
    assert 0.0 <= signal.confidence <= 1.0
    assert signal.timestamp == 100.0


def test_recent_returns_newest_first():
    feed = AgentFeed(seed=0)
    first = feed.generate_signal(now=1.0)
    second = feed.generate_signal(now=2.0)
    recent = feed.recent(limit=10)
    assert recent[0].signal_id == second.signal_id
    assert recent[1].signal_id == first.signal_id


def test_recent_respects_limit():
    feed = AgentFeed(seed=0)
    for i in range(10):
        feed.generate_signal(now=float(i))
    assert len(feed.recent(limit=3)) == 3


def test_signal_ids_increment():
    feed = AgentFeed(seed=0)
    ids = [feed.generate_signal(now=float(i)).signal_id for i in range(5)]
    assert ids == sorted(ids)
    assert len(set(ids)) == 5
