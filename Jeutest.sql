SET search_path TO finops_dm;

--------------------------------------------------
-- DOMAINS
--------------------------------------------------

INSERT INTO dim_domain(domain_id,domain_code,domain_name,is_active,is_indirect,created_at,updated_at)
VALUES
(1,'CLOUD','Cloud Infrastructure',true,false,now(),now()),
(2,'DATA','Data Platform',true,false,now(),now()),
(3,'SECURITY','Security Services',true,false,now(),now());


--------------------------------------------------
-- FAMILIES
--------------------------------------------------

INSERT INTO dim_family(family_id,domain_id,family_code,family_name,created_at,updated_at)
VALUES
(10,1,'COMPUTE','Compute',now(),now()),
(11,1,'STORAGE','Storage',now(),now()),
(12,1,'NETWORK','Network',now(),now()),

(20,2,'DATABASE','Databases',now(),now()),
(21,2,'STREAM','Streaming',now(),now()),

(30,3,'IAM','Identity',now(),now()),
(31,3,'SCAN','Security Scanning',now(),now());


--------------------------------------------------
-- PRODUCTS
--------------------------------------------------

INSERT INTO dim_product(product_id,product_code,product_name,domain_id,family_id,created_at,updated_at)
VALUES
(100,'K8S_CPU','Kubernetes CPU',1,10,now(),now()),
(101,'K8S_RAM','Kubernetes Memory',1,10,now(),now()),
(102,'S3_STORAGE','Object Storage',1,11,now(),now()),
(103,'LB_NETWORK','Load Balancer',1,12,now(),now()),

(200,'POSTGRES_DB','PostgreSQL',2,20,now(),now()),
(201,'MONGO_DB','MongoDB',2,20,now(),now()),
(202,'KAFKA_STREAM','Kafka',2,21,now(),now()),

(300,'KEYCLOAK','Keycloak IAM',3,30,now(),now()),
(301,'SONAR_SCAN','Sonar Security Scan',3,31,now(),now());


--------------------------------------------------
-- ENVIRONMENTS
--------------------------------------------------

INSERT INTO dim_environment(environment_id,environment_code,environment_name,created_at,updated_at)
VALUES
(1,'DEV','Development',now(),now()),
(2,'INT','Integration',now(),now()),
(3,'PREPROD','Preproduction',now(),now()),
(4,'PROD','Production',now(),now());


--------------------------------------------------
-- PRICING VIEW
--------------------------------------------------

INSERT INTO pricing_view(pricing_view_id,pricing_view_code,name,created_by,updated_at)
VALUES
('11111111-1111-1111-1111-111111111111','STANDARD','Standard Pricing','system',now()),
('22222222-2222-2222-2222-222222222222','DISCOUNT','Discount Pricing','system',now());


--------------------------------------------------
-- PRICING VIEW LINES
--------------------------------------------------

INSERT INTO pricing_view_line(pricing_view_id,product_id,unit_price,currency,created_at)
VALUES

-- STANDARD
('11111111-1111-1111-1111-111111111111',100,0.05,'EUR',now()),
('11111111-1111-1111-1111-111111111111',101,0.01,'EUR',now()),
('11111111-1111-1111-1111-111111111111',102,0.02,'EUR',now()),
('11111111-1111-1111-1111-111111111111',103,5.00,'EUR',now()),
('11111111-1111-1111-1111-111111111111',200,15.00,'EUR',now()),
('11111111-1111-1111-1111-111111111111',201,12.00,'EUR',now()),
('11111111-1111-1111-1111-111111111111',202,8.00,'EUR',now()),
('11111111-1111-1111-1111-111111111111',300,4.00,'EUR',now()),
('11111111-1111-1111-1111-111111111111',301,2.00,'EUR',now()),

-- DISCOUNT
('22222222-2222-2222-2222-222222222222',100,0.04,'EUR',now()),
('22222222-2222-2222-2222-222222222222',101,0.008,'EUR',now()),
('22222222-2222-2222-2222-222222222222',102,0.015,'EUR',now()),
('22222222-2222-2222-2222-222222222222',103,4.00,'EUR',now()),
('22222222-2222-2222-2222-222222222222',200,13.00,'EUR',now()),
('22222222-2222-2222-2222-222222222222',201,10.00,'EUR',now()),
('22222222-2222-2222-2222-222222222222',202,7.00,'EUR',now()),
('22222222-2222-2222-2222-222222222222',300,3.50,'EUR',now()),
('22222222-2222-2222-2222-222222222222',301,1.50,'EUR',now());


--------------------------------------------------
-- PRICING CALENDAR
--------------------------------------------------

INSERT INTO pricing_calendar(month,pricing_view_id,is_frozen)
VALUES
(202401,'11111111-1111-1111-1111-111111111111',true),
(202402,'11111111-1111-1111-1111-111111111111',true),
(202403,'11111111-1111-1111-1111-111111111111',true),
(202404,'11111111-1111-1111-1111-111111111111',true),
(202405,'11111111-1111-1111-1111-111111111111',false),
(202406,'11111111-1111-1111-1111-111111111111',false);


--------------------------------------------------
-- FACT CONSUMPTION
--------------------------------------------------

INSERT INTO fact_consumption_monthly
(month,application_id,product_id,environment_id,quantity,created_at,updated_at)

VALUES

-- APP PAYMENTS
(202401,'payments-api',100,4,20000,now(),now()),
(202401,'payments-api',101,4,100000,now(),now()),
(202401,'payments-api',200,4,30,now(),now()),

(202402,'payments-api',100,4,24000,now(),now()),
(202402,'payments-api',101,4,110000,now(),now()),
(202402,'payments-api',200,4,35,now(),now()),

(202403,'payments-api',100,4,26000,now(),now()),
(202403,'payments-api',101,4,120000,now(),now()),
(202403,'payments-api',200,4,38,now(),now()),


-- APP FRONTEND
(202401,'frontend-web',100,4,12000,now(),now()),
(202401,'frontend-web',101,4,60000,now(),now()),
(202401,'frontend-web',102,4,4000,now(),now()),

(202402,'frontend-web',100,4,15000,now(),now()),
(202402,'frontend-web',101,4,65000,now(),now()),
(202402,'frontend-web',102,4,5000,now(),now()),

(202403,'frontend-web',100,4,18000,now(),now()),
(202403,'frontend-web',101,4,72000,now(),now()),
(202403,'frontend-web',102,4,6000,now(),now()),


-- APP DATA PLATFORM
(202401,'data-platform',201,4,20,now(),now()),
(202401,'data-platform',202,4,60,now(),now()),

(202402,'data-platform',201,4,25,now(),now()),
(202402,'data-platform',202,4,70,now(),now()),

(202403,'data-platform',201,4,30,now(),now()),
(202403,'data-platform',202,4,90,now(),now()),


-- APP SECURITY
(202401,'security-tools',300,4,2000,now(),now()),
(202401,'security-tools',301,4,5000,now(),now()),

(202402,'security-tools',300,4,2200,now(),now()),
(202402,'security-tools',301,4,6000,now(),now()),

(202403,'security-tools',300,4,2600,now(),now()),
(202403,'security-tools',301,4,7000,now(),now());
