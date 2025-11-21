# Running the Game Server

## Option 1: Use the Custom Server (Recommended)

The custom server handles audio files properly:

```bash
python3 server.py
```

Then open: http://localhost:8000

## Option 2: Use Python's Simple Server

If you prefer the standard Python server:

```bash
python3 -m http.server 8000
```

Then open: http://localhost:8000

**Note:** The custom server (`server.py`) handles audio range requests better and prevents 416 errors.

## Troubleshooting

If you get 416 errors with audio files:
1. Use `server.py` instead of `python -m http.server`
2. Make sure all sound files exist in `sounds/` directory
3. Check browser console for specific errors

