# Kubernetes Terraform configuration

This directory contains Terraform configuration for resources inside the existing Hidden Peak EKS cluster. It is separate from [`../tf/`](../tf/README.md), which provisions the AWS infrastructure and cluster.

## What it manages

- `provider.tf` configures the Kubernetes provider using the `hidden-peak` EKS cluster and AWS CLI token authentication. Terraform state is configured in the `hpp-k8s.tfstate` key of an S3 backend.
- `kubernetes.tf` looks up the tagged production RDS instance, creates the `prod` namespace, and creates the `hpp-secrets` Kubernetes Secret consumed by the application manifests.

The `kubernetes_secret.app` currently includes application configuration values directly in Terraform source. Do not use this as a production secret-management pattern. Move credentials and signing keys to a managed secret system (for example, AWS Secrets Manager with an appropriate Kubernetes integration), rotate any values that have been committed, and prevent secrets from appearing in Terraform plans, state, logs, or source control. Terraform state can contain secret values even when output is masked.

## Prerequisites

- AWS CLI credentials authorized to read the `hidden-peak` EKS cluster and the tagged RDS instance.
- `kubectl` access to the cluster.
- Terraform initialized with access to the configured remote S3 state backend.
- The AWS infrastructure in [`../tf/`](../tf/README.md) already provisioned, including the cluster and database.

## Review and apply

From this directory, review the plan before applying:

```powershell
terraform init
terraform validate
terraform plan
terraform apply
```

Confirm the AWS account, region, cluster, namespace, database endpoint, and secret-management approach before applying. Do not apply until inline secret material has been removed and the replacement values are supplied securely.

The workload manifests are in [`../kube/`](../kube/README.md). Argo CD applies those manifests; this Terraform directory does not install or update the frontend, backend, or Redis workloads.
