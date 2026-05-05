variable "aws_region" {
  description = "Région AWS pour le VPC et le cluster EKS."
  type        = string
  default     = "eu-west-3"
}

variable "project_name" {
  description = "Préfixe pour les noms de ressources (tags, cluster, VPC)."
  type        = string
  default     = "workadventure"
}

variable "cluster_name" {
  description = "Nom du cluster EKS (doit respecter les contraintes AWS)."
  type        = string
  default     = null
}

variable "cluster_version" {
  description = "Version Kubernetes du plan de contrôle EKS."
  type        = string
  default     = "1.31"
}

variable "vpc_cidr" {
  description = "CIDR du VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "single_nat_gateway" {
  description = "Si true, un seul NAT (moins cher, moins résilient). Mettre false en prod multi-AZ."
  type        = bool
  default     = true
}

variable "eks_public_access" {
  description = "Autoriser l'API EKS depuis Internet (pratique pour kubectl depuis ton poste)."
  type        = bool
  default     = true
}

variable "eks_public_access_cidrs" {
  description = "CIDRs autorisés pour l'endpoint public EKS (0.0.0.0/0 = monde entier)."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "node_instance_types" {
  description = "Types d'instance pour le node group managé par défaut."
  type        = list(string)
  default     = ["m6i.large"]
}

variable "node_desired_size" {
  type    = number
  default = 2
}

variable "node_min_size" {
  type    = number
  default = 2
}

variable "node_max_size" {
  type    = number
  default = 8
}

variable "enable_ingress_nginx" {
  description = "Déploie ingress-nginx (compatible avec les annotations nginx du chart Helm WorkAdventure)."
  type        = bool
  default     = true
}

variable "ingress_nginx_chart_version" {
  type    = string
  default = "4.11.3"
}

variable "enable_cert_manager" {
  description = "Déploie cert-manager (TLS pour les Ingress du chart WorkAdventure)."
  type        = bool
  default     = true
}

variable "cert_manager_chart_version" {
  type    = string
  default = "v1.16.2"
}

variable "enable_metrics_server" {
  description = "Déploie metrics-server (HPA / kubectl top)."
  type        = bool
  default     = true
}

variable "metrics_server_chart_version" {
  type    = string
  default = "3.12.2"
}

variable "tags" {
  description = "Tags communs sur les ressources AWS."
  type        = map(string)
  default     = {}
}
