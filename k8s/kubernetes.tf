data "aws_db_instance" "ou" {
  tags = {
    environment = "prod"
    role = "database"
  }
}

resource "kubernetes_secret" "app" {
  metadata {
    name      = "hpp-secrets"
    namespace = "prod"
  }

  data = {
    DATABASE_URL = "postgresql://admin1:admin123@${data.aws_db_instance.ou.endpoint}/hhpdb?schema=public&sslmode=require"
    SEED_ADMIN_EMAIL = "amarricaden42@gmail.com"
    SEED_ADMIN_PASSWORD = "amarri2004"
    EXPO_PUBLIC_API_URL = "http://backend:3000/api"
    JWT_ACCESS_SECRET  = "IJotO0rzhj5m64Ybyb/g4/O9sbhyuphiNjGeGDDqZp8="
    JWT_REFRESH_SECRET = "CxXYGfnc21S5wkWjjKlXrnJH1PrA0ecRCP5jedJqFr0="

  }

  type = "Opaque"
}

output "db_endpoint" {
  value = data.aws_db_instance.ou.endpoint
  
}
resource "kubernetes_namespace" "prod"  {
  metadata {
    name = "prod"
  }
}