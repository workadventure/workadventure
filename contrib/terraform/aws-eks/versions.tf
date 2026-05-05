# Infra EKS + addons Helm (ingress-nginx, cert-manager, metrics-server) pour héberger le chart WorkAdventure.
#
# Premier déploiement : si `terraform plan` échoue car l’endpoint du cluster
# n’est pas encore connu pour le provider Helm, exécuter dans l’ordre :
#   terraform apply -target=module.vpc -target=module.eks
#   terraform apply
#
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.61"
    }
    helm = {
      source  = "hashicorp/helm"
      version = ">= 2.14"
    }
  }

  # Décommente et adapte pour un state distant (recommandé en équipe / prod).
  # backend "s3" {
  #   bucket         = "my-org-terraform-state"
  #   key            = "workadventure/eks/terraform.tfstate"
  #   region         = "eu-west-3"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}
