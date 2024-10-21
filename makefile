.PHONY: copy-db


build:
	@export $(shell sed 's/=.*//' .env) && npm run tauri build

copy-db:
	@bash scripts/copy_sqlite_db.sh