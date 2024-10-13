build:
	@export $(shell sed 's/=.*//' .env) && npm run tauri build