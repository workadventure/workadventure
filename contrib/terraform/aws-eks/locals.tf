locals {
  cluster_name = coalesce(var.cluster_name, "${var.project_name}-eks")

  default_tags = merge(
    {
      Project     = var.project_name
      ManagedBy   = "terraform"
      Environment = "workadventure-k8s"
    },
    var.tags
  )
}
