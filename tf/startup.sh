#!/bin/bash

aws eks update-kubeconfig --name hidden-peak --region us-west-1
kubectl create namespace prod
kubectl create namespace monitoring
kubectl create namespace argocd
helm repo add argo https://argoproj.github.io/argo-helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install argocd argo/argo-cd --namespace argocd --create-namespace
helm install prometheus prometheus-community/kube-prometheus-stack --namespace monitoring --create-namespace
kubectl apply -f argo/argocd.yaml
kubectl get secrets -n argocd argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d; echo
kubectl get secrets -n monitoring prometheus-kube-prometheus-prometheus -o jsonpath="{.data.prometheus\.yml}" | base64 -d; echo