# gunicorn.conf.py
timeout = 120  # seconds
worker_class = "sync"
workers = 2
