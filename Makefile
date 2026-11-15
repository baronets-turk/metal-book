PORT ?= 8766
URL := http://127.0.0.1:$(PORT)/

.PHONY: run open stop check

run:
	@if curl -s -o /dev/null $(URL); then \
		echo "Already running at $(URL) (pid $$(lsof -ti tcp:$(PORT) -sTCP:LISTEN | head -1)). Open it with: make open. Stop it with: make stop"; \
		exit 0; \
	fi; \
	echo "Serving at $(URL)  (Ctrl+C to stop)"; \
	python3 -I -m http.server $(PORT) --bind 127.0.0.1 --directory .

open:
	@curl -s -o /dev/null $(URL) || (python3 -I -m http.server $(PORT) --bind 127.0.0.1 --directory . >/dev/null 2>&1 & sleep 1)
	open $(URL)

stop:
	@pid=$$(lsof -ti tcp:$(PORT) -sTCP:LISTEN | head -1); \
	if [ -n "$$pid" ]; then kill $$pid && echo "Stopped server on port $(PORT) (pid $$pid)"; else echo "Nothing is running on port $(PORT)"; fi

check:
	python3 -I tools/i18n.py
	@for f in assets/*.js; do node --check $$f || exit 1; done
