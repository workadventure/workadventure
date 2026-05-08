RELEASE    ?= workadventure
NAMESPACE  ?= workadventure
CHART_DIR  ?= .

DEV_PROFILE ?= AdministratorAccess-123567778292
DEV_CONTEXT ?= arn:aws:eks:eu-central-1:123567778292:cluster/generic-cluster
DEV_VALUES  ?= values.development.yaml

.PHONY: help deps lint template validate verify deploy-dev clean

help:
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z0-9_.-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

deps: ## Fetch/refresh upstream chart dependencies
	helm dependency update $(CHART_DIR)

lint: deps ## Run helm lint against the dev values
	helm lint $(CHART_DIR) -f $(DEV_VALUES)

template: deps ## Render templates to stdout with dev values
	helm template $(RELEASE) $(CHART_DIR) -n $(NAMESPACE) -f $(DEV_VALUES)

validate: deps ## Render + pipe through kubeconform (requires kubeconform)
	@command -v kubeconform >/dev/null || { echo "kubeconform not installed: brew install kubeconform"; exit 1; }
	helm template $(RELEASE) $(CHART_DIR) -n $(NAMESPACE) -f $(DEV_VALUES) | \
		kubeconform -strict -ignore-missing-schemas -kubernetes-version 1.30.0

verify: lint validate ## Full local check: lint + schema validation

deploy-dev: deps ## Deploy to the dev cluster (account 123567778292)
	@test "$$(kubectl config current-context)" = "$(DEV_CONTEXT)" || \
		{ echo "kubectl context is not dev. Run: kubectl config use-context $(DEV_CONTEXT)"; exit 1; }
	AWS_PROFILE=$(DEV_PROFILE) helm upgrade --install $(RELEASE) $(CHART_DIR) \
		-n $(NAMESPACE) --create-namespace -f $(DEV_VALUES)

clean: ## Remove downloaded chart dependencies and lock file
	rm -rf $(CHART_DIR)/charts $(CHART_DIR)/Chart.lock

up: ## Start Docker containers
	docker compose up -d

stop: ## Stop Docker containers
	docker compose stop