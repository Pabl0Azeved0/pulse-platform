restart-full:
	docker compose down -v
	docker volume prune -f
	docker rmi -f $$(docker images -aq) || true
	docker compose up --build -d

restart:
	docker compose down
	docker compose up --build -d