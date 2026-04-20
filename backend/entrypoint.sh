#!/bin/sh
set -e

python manage.py makemigrations core
python manage.py migrate
python manage.py seed_demo
exec "$@"
