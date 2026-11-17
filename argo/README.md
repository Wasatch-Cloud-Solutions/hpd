# Argo CD application

`argocd.yaml` declares an Argo CD `Application` named `hpp`. It tells Argo CD to:

- Read the `kube/` directory from the `main` branch of this repository.
- Deploy the manifests to the in-cluster Kubernetes API, in the `prod` namespace.
- Automatically synchronize changes, prune resources removed from Git, and self-heal drift.

This makes Git the desired-state source for the application workloads. Review changes to [`../kube/`](../kube/README.md) carefully: automated pruning can delete resources that disappear from the tracked manifests.

## Prerequisites and setup

The EKS cluster must exist and Argo CD must already be installed with access to the repository. The repository includes [`../tf/startup.sh`](../tf/startup.sh), which installs Argo CD and applies this Application, but review that script for your environment before running it.

Apply the application definition after connecting `kubectl` to the target cluster:

```powershell
kubectl apply -f argo/argocd.yaml
```

The command above assumes it is run from the repository root. Check synchronization and health in the Argo CD UI or with `argocd app get hpp`.

## Operational notes

- The repository URL, target branch, manifest path, and destination namespace are fixed in the Application manifest. Change them when deploying a fork, release branch, or separate environment.
- The Application only deploys Kubernetes resources from `kube/`; it does not provision AWS networking, EKS, RDS, or Kubernetes Secrets.
- Ensure the `prod` namespace and required `hpp-secrets` Secret exist before workload pods start. See [`../k8s/`](../k8s/README.md).
- Automated sync is convenient but should be paired with reviewed pull requests, protected branches, image provenance, and controlled promotion to production.
