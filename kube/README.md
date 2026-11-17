# Kubernetes application manifests

This directory contains Kubernetes YAML manifests for the Hidden Peak Dining application. The Argo CD application in [`../argo/`](../argo/README.md) watches this directory on the repository's `main` branch and deploys its resources into the `prod` namespace.

## Workloads

- `frontend.yaml` runs the exported Expo web client in Nginx and exposes it through a `LoadBalancer` Service on port 80. The Nginx configuration proxies `/api/` requests to the in-cluster `backend` Service.
- `back.yaml` runs the NestJS API behind a `ClusterIP` Service. Init containers run Prisma migrations and the seed script before the API container starts. It also declares a Prometheus Operator `ServiceMonitor`.
- `redis.yaml` runs a single Redis 7 StatefulSet, persistent storage, and an in-cluster Service. The API can use Redis as its Socket.IO adapter when configured.

The backend expects the `hpp-secrets` Secret in the `prod` namespace. The Terraform configuration in [`../k8s/`](../k8s/README.md) currently creates this Secret; configure it using managed secrets before deployment.

## Deployment flow

1. Provision AWS networking, EKS, and the database using [`../tf/`](../tf/README.md).
2. Configure cluster-level resources and the application Secret using [`../k8s/`](../k8s/README.md), after securing secret values.
3. Install/configure Argo CD and apply [`../argo/argocd.yaml`](../argo/argocd.yaml). Argo CD then syncs this directory to `prod`.
4. Build and publish the API and frontend images, and update the image references in the manifests to the intended immutable image tags or digests.

Argo CD is configured for automated sync, pruning, and self-healing. A change to this directory can therefore alter or remove live resources without a manual `kubectl apply`.

## Before using in production

Review these manifests against the target cluster rather than assuming they are production-ready:

- The API and frontend use fixed image tags; ensure the images exist, are trusted, and are updated through a controlled release process.
- The frontend LoadBalancer is publicly reachable according to the cluster's network configuration. Add the intended TLS and ingress/load-balancer controls.
- The API manifest references a metrics port and a `ServiceMonitor`; verify the application actually serves metrics there and that the Prometheus Operator selects this monitor in the `prod` namespace.
- The API init containers run migrations and seeding during pod initialization. Ensure these operations are safe and idempotent for each rollout.
- Redis storage declarations and PVC behavior should be checked for the cluster's storage class and recovery requirements.
- Set resource requests/limits, replica and availability settings, probes, network policies, and pod security settings appropriate for the deployment.
- Avoid putting credentials in these manifests. Use a managed secrets solution and rotate any credentials previously stored in Git or Terraform state.

These manifests describe the current deployment shape; they do not provision the EKS cluster or RDS database.
