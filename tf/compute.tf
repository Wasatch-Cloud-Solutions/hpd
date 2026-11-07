module "kube" {
  source = "git::https://github.com/techwmarcus/aws-modules.git//kube"

  cluster_name       = "hidden-peak"
  desired_capacity   = 2
  max_capacity       = 3
  min_capacity       = 1
  private_subnet_ids = module.vpc.private_subnet_ids

}

resource "aws_eks_access_entry" "admin" {
  cluster_name  = module.kube.cluster_name
  principal_arn = "arn:aws:iam::716563790644:user/admin"
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "admin" {
  cluster_name  = module.kube.cluster_name
  principal_arn = "arn:aws:iam::716563790644:user/admin"

  policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_access_entry.admin]
}

resource "aws_eks_access_entry" "admin1" {
  cluster_name  = module.kube.cluster_name
  principal_arn = "arn:aws:iam::716563790644:role/git-ops"
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "admin1" {
  cluster_name  = module.kube.cluster_name
  principal_arn = "arn:aws:iam::716563790644:role/git-ops"

  policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_access_entry.admin1]
}

############
# DATABASE 
############
resource "aws_db_instance" "default" {
  allocated_storage    = 10
  db_name              = "hpp-db"
  engine               = "postgres"
  engine_version       = "16.3"
  instance_class       = "db.t3.micro"
  username             = "admin"
  password             = "admin123"
  skip_final_snapshot  = true
  db_subnet_group_name = aws_db_subnet_group.default.name
  vpc_security_group_ids = [module.vpc.db_sg]
  publicly_accessible = true

}
output "db-endpoint" {
  value = aws_db_instance.default.endpoint
}


resource "aws_db_subnet_group" "default" {
  name       = "main"
  subnet_ids = module.vpc.public_subnet_ids

  tags = {
    Name = "My DB subnet group"
  }
}
output "db-subnet-group" {
  value = aws_db_subnet_group.default.name
}