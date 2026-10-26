from app.market_data import MarketDataStore, resample, Candle, SYMBOLS, TIMEFRAMES


def test_store_generates_data_for_every_symbol():
    store = MarketDataStore(n_minutes=120, seed=0)
    for symbol in SYMBOLS:
        candles = store.get_candles(symbol, "1m", limit=1000)
        assert len(candles) == 120


def test_unknown_symbol_raises():
    store = MarketDataStore(n_minutes=10, seed=0)
    try:
        store.get_candles("NOTREAL", "1m")
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_resample_aggregates_ohlc_correctly():
    candles = [
        Candle(timestamp=0, open=100, high=105, low=98, close=102, volume=10),
        Candle(timestamp=1, open=102, high=110, low=101, close=108, volume=20),
        Candle(timestamp=2, open=108, high=109, low=95, close=97, volume=15),
    ]
    resampled = resample(candles, minutes_per_candle=3)
    assert len(resampled) == 1
    merged = resampled[0]
    assert merged.open == 100  # first candle's open
    assert merged.high == 110  # max high across the chunk
    assert merged.low == 95  # min low across the chunk
    assert merged.close == 97  # last candle's close
    assert merged.volume == 45  # sum of volumes


def test_resample_identity_for_1m():
    candles = [Candle(0, 1, 2, 0.5, 1.5, 10)]
    assert resample(candles, 1) == candles


def test_higher_timeframes_have_fewer_candles():
    store = MarketDataStore(n_minutes=120, seed=1)
    one_min = store.get_candles("AAPL", "1m", limit=1000)
    five_min = store.get_candles("AAPL", "5m", limit=1000)
    assert len(five_min) == len(one_min) // 5


def test_reproducible_with_same_seed():
    a = MarketDataStore(n_minutes=50, seed=42)
    b = MarketDataStore(n_minutes=50, seed=42)
    assert a.get_candles("BTCUSD", "1m") == b.get_candles("BTCUSD", "1m")


def test_latest_price_matches_last_candle_close():
    store = MarketDataStore(n_minutes=30, seed=2)
    candles = store.get_candles("ETHUSD", "1m", limit=1000)
    assert store.latest_price("ETHUSD") == candles[-1].close
