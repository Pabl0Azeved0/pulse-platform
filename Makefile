.DEFAULT_GOAL := help

.PHONY: help restart-full restart restart-db populate-db format

help:
	@echo "Usage: make [command]"
	@echo ""
	@echo "Commands:"
	@echo "  restart       : 🔄 Standard restart (stop containers, rebuild, and up)"
	@echo "  restart-db    : 💽 Wipes the Database volume and restarts (Fresh DB)"
	@echo "  restart-full  : 🔥 NUKE & PAVE: Wipes volumes, images, and rebuilds everything"
	@echo "  populate-db   : 🌱 Runs the Python script to seed the DB with users/posts"
	@echo "  format        : 🎨 Auto-formats Backend (Black) and Frontend (Prettier)"
	@echo ""
	@echo "Prod Commands:"
	@echo "  prod          : 🚀 Build and Run in Production Mode (Nginx)"
	@echo ""

restart-full:
	@echo "🔥 Nuke & Pave: Stopping containers, pruning volumes & images..."
	@docker compose down -v
	@docker volume prune -f
	@# Removes all images to ensure a fresh pull/build
	@docker rmi -f $$(docker images -aq) || true
	@echo "🚀 Rebuilding and starting everything..."
	@docker compose up --build -d
	@echo "✅ Full restart complete!"

restart:
	@echo "🔄 Restarting services..."
	@docker compose down
	@docker compose up --build -d
	@echo "✅ Services restarted!"

restart-db:
	@echo "💽 Resetting Database (Volumes wiped)..."
	@docker compose down -v
	@docker compose up --build -d
	@echo "✅ Database reset complete!"

populate-db:
	@echo "🌱 Seeding database with dummy data..."
	@docker compose exec backend python populate_db.py
	@echo "✅ Database populated successfully!"

format:
	@echo "🎨 Formatting Backend (Python)..."
	@# Smart Check: Use venv black if it exists, otherwise try global
	@if [ -x "backend/venv/bin/black" ]; then \
		echo "   -> Using virtual environment 'black'..."; \
		./backend/venv/bin/black backend/*.py; \
	else \
		echo "   -> Venv not found/executable. Trying global 'black'..."; \
		black backend/*.py || echo "⚠️  Black not found! Make sure your venv is set up."; \
	fi
	@echo "🎨 Formatting Frontend (Prettier)..."
	@cd frontend && npx prettier --write "src/**/*.{ts,tsx,css,json}"
	@echo "✅ Code formatting complete!"

prod:
	@echo "🚀 Building and Starting Production Environment..."
	@# We stop the dev containers first to free up ports
	@docker compose down
	@docker compose -f docker-compose.prod.yml up --build -d
	@echo "✅ Pulse is live at http://localhost (Port 80)"