terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "amarri-tf-state"
    key    = "hpp.tfstate"
    region = "us-west-1"
  }
}

data "aws_region" "current" {}