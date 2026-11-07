module "vpc" {
  source = "git::https://github.com/techwmarcus/aws-modules.git//vpc"

  pub_subnet_name = "public-subnet"
  prv_subnet_name = "private-subnet"
  vpc_name        = "hidden-peak-vpc"
}