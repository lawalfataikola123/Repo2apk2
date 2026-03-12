# ════════════════════════════════════════════════════════════════════
# Repo2APK Makefile
# ════════════════════════════════════════════════════════════════════

.PHONY: help build up down logs clean dev install

# Default target
help:
	@echo "Repo2APK - Available commands:"
	@echo ""
	@echo "  make install    Install all dependencies"
	@echo "  make build      Build Docker images"
	@echo "  make up         Start all services"
	@echo "  make down       Stop all services"
	@echo "  make logs       View application logs"
	@echo "  make clean      Remove containers, volumes, and build artifacts"
	@echo "  make dev        Start in development mode (without Docker)"
	@echo "  make health     Check application health"

# Install local dependencies (for development)
install:
	cd server && npm install
	cd client && npm install

# Build Docker image
build:
	docker-compose build

# Start production services
up:
	@if [ ! -f .env ]; then \
		echo "⚠️  .env file not found. Copying from .env.example..."; \
		cp .env.example .env; \
		echo "Please edit .env with your configuration before proceeding."; \
		exit 1; \
	fi
	docker-compose up -d
	@echo "✅ Repo2APK started. Access at http://localhost"

# Stop all services
down:
	docker-compose down

# View logs
logs:
	docker-compose logs -f app

# Clean everything
clean:
	docker-compose down -v --remove-orphans
	docker system prune -f
	rm -rf builds/* logs/*
	@echo "✅ Cleaned up"

# Development mode (no Docker)
dev:
	@echo "Starting development servers..."
	@(cd server && npm run dev &) && (cd client && npm run dev)

# Health check
health:
	@curl -sf http://localhost:5000/api/health | python3 -m json.tool || echo "❌ Server not responding"

# View build history
history:
	@curl -sf http://localhost:5000/api/build/history | python3 -m json.tool

# Shell into container
shell:
	docker-compose exec app sh

# Rebuild without cache
rebuild:
	docker-compose build --no-cache
	docker-compose up -d
