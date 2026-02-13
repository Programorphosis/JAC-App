#!/bin/bash
set -e

echo "Esperando a PostgreSQL..."
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  sleep 1
done

echo "PostgreSQL está listo"
