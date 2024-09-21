-- Table Definition ----------------------------------------------

CREATE TABLE app (
  id SERIAL PRIMARY KEY,
  name character varying(64),
  slug character varying(64) UNIQUE,
  date_created timestamp with time zone DEFAULT now(),
  redirect_url character varying(128),
  email_domain character varying(64),
  secret character varying(32) DEFAULT md5(random()::text) UNIQUE,
  email_api_key character varying(50),
  email_api_server character varying(50)
  -- Stripe payments: credits
  credits_price integer,
  credits_start integer, -- credits given to new users
  currency character varying(3)
);

-- Table Definition ----------------------------------------------

CREATE TABLE person (
  id SERIAL PRIMARY KEY,
  email character varying(128) UNIQUE,
  date_created timestamp with time zone DEFAULT now(),
  first_name character varying(32),
  last_name character varying(32),
  country character varying(2)
);

-- Table Definition ----------------------------------------------

CREATE TABLE person_app (
  person_id integer NOT NULL REFERENCES person(id) ON DELETE CASCADE,
  app_id integer NOT NULL REFERENCES app(id) ON DELETE CASCADE,
  secret character varying(32) DEFAULT md5(random()::text) UNIQUE,
  metadata json,
  user_id character varying(32) DEFAULT md5(random()::text) UNIQUE,
  username character varying(32),
  can_login boolean DEFAULT true,
  subscribe_email boolean DEFAULT true,
  subscribe_sms boolean DEFAULT true,
  date_created timestamp with time zone DEFAULT now(),
  -- Stripe payments
  purchase_session_id character varying(80),
  subscription_session_id character varying(80),
  credits integer
);
