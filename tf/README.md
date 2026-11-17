# AWS infrastructure Terraform

This directory contains the AWS infrastructure layer for Hidden Peak Dining. It uses Terraform modules from the external `techwmarcus/aws-modules` repository and a separate S3 backend from the Kubernetes-resource configuration in [`../k8s/`](../k8s/README.md).

## Resources described

- `network.tf` calls the external VPC module for the application network and public/private subnet IDs.
- `compute.tf` calls the external EKS module for a cluster and worker capacity, configures EKS access entries, and defines a PostgreSQL RDS instance and subnet group. It also exposes database-related Terraform outputs.
- `provider.tf` pins the AWS provider to the 5.x series and configures the `hpp.tfstate` S3 backend.
- `startup.sh` is a helper for configuring `kubectl`, creating namespaces, installing Argo CD and the Prometheus stack with Helm, and applying the Argo CD Application.

The external module source is a Git dependency. Review its version/revision and implementation before relying on its behavior. Pin a reviewed commit or release rather than tracking mutable upstream code for reproducible infrastructure.

## Deployment relationship

The intended high-level order is:

1. Use this directory to provision the AWS network, EKS cluster, and RDS instance.
2. Use [`../k8s/`](../k8s/README.md) to configure Kubernetes-provider resources, the `prod` namespace, and application configuration.
3. Use [`../argo/`](../argo/README.md) to register the Argo CD Application, which deploys manifests from [`../kube/`](../kube/README.md).

Initialize and inspect Terraform from this directory:

```powershell
terraform init
terraform validate
terraform plan
```

Do not run `terraform apply` until the account, region, module code, permissions, networking, state backend, cost, and data-protection settings have been reviewed. The state backend must exist and be configured for secure access and locking according to your Terraform version and backend setup.

## Critical security and reliability review

The current configuration contains production-risk settings that must be corrected before deployment or reuse:

- Database credentials are configured inline in Terraform. Replace them with a secure input/secret workflow, rotate any values that have been committed, and protect Terraform state because it can contain sensitive attributes.
- The RDS instance is configured as publicly accessible and uses a public-subnet group. Restrict database access to required private network paths and avoid public exposure.
- Final snapshots are disabled for the database. Define a backup, retention, recovery, and deletion policy before using it with data that must be preserved.
- EKS administrator access is granted to specific IAM principals. Verify those principals, scope access to least privilege, and avoid embedding account-specific identities in reusable configurations.
- Validate the database engine version, instance sizing, subnet placement, encryption, security groups, and availability settings against the AWS account and region.
- The `startup.sh` helper retrieves an initial Argo CD password and monitoring configuration. Treat its output as sensitive and do not paste it into logs or commit it.

Do not publish state files, plans containing secrets, or generated credentials. Use managed secret storage and a reviewed state backend with appropriate encryption and access controls.
