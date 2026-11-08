resource "kubernetes_secret" "app" {
  metadata {
    name      = "hpp-secrets"
    namespace = "prod"
  }

  data = {
    DATABASE_URL = base64encode(aws_db_instance.default.endpoint)
    SEED_ADMIN_EMAIL = base64encode("amarricaden42@gmail.com")
    SEED_ADMIN_PASSWORD = base64encode("amarri2004")
    API_KEY     = base64encode("xyz-123-token")
    EXPO_PUBLIC_API_URL = base64encode("http://backend:3000/api")
  }

  type = "Opaque"
}

resource "kubernetes_namespace" "prod"  {
  metadata {
    name = "prod"
  }
}