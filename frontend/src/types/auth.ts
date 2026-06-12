export interface User {
  id: string;
  email: string;
  full_name: string;
  auth_provider: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
