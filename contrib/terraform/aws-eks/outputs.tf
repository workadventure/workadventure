output "cluster_name" {
  description = "Nom du cluster EKS."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint HTTPS de l'API Kubernetes."
  value       = module.eks.cluster_endpoint
}

output "cluster_oidc_issuer_url" {
  description = "Issuer URL du fournisseur OIDC du cluster (IRSA / workload identity)."
  value       = module.eks.cluster_oidc_issuer_url
}

output "vpc_id" {
  value = module.vpc.vpc_id
}

output "private_subnets" {
  description = "Sous-réseaux privés utilisés par les nœuds EKS."
  value       = module.vpc.private_subnets
}

output "configure_kubectl" {
  description = "Commande pour configurer kubeconfig sur ta machine."
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "helm_workadventure_ingress_class" {
  description = "Valeur à utiliser pour ingress.className dans le chart WorkAdventure (ingress-nginx)."
  value       = var.enable_ingress_nginx ? "nginx" : null
}

output "ebs_csi_note" {
  description = "L’addon managé aws-ebs-csi-driver est installé ; vérifie les StorageClass avec kubectl (gp3 est couramment ajouté à part)."
  value       = "Addon aws-ebs-csi-driver présent — exécuter: kubectl get storageclass"
}
