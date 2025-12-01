import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ChefHat } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './ui/sonner';

interface AuthPageProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
  onSignup: (username: string, password: string) => Promise<boolean>;
}

export function AuthPage({ onLogin, onSignup }: AuthPageProps) {
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = loginUsername.trim();
    const trimmedPassword = loginPassword.trim();
    
    if (!trimmedUsername || !trimmedPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    const success = await onLogin(trimmedUsername, trimmedPassword);
    setIsLoading(false);
    if (!success) {
      toast.error('Invalid credentials');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = signupUsername.trim();
    const trimmedPassword = signupPassword.trim();
    const trimmedConfirm = signupConfirm.trim();
    
    if (!trimmedUsername || !trimmedPassword || !trimmedConfirm) {
      toast.error('Please fill in all fields');
      return;
    }
    if (trimmedPassword !== trimmedConfirm) {
      toast.error('Passwords do not match');
      return;
    }
    setIsLoading(true);
    const success = await onSignup(trimmedUsername, trimmedPassword);
    setIsLoading(false);
    if (success) {
      setSignupUsername('');
      setSignupPassword('');
      setSignupConfirm('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative" style={{
      background: `linear-gradient(135deg, rgba(250, 248, 245, 0.97) 0%, rgba(245, 241, 237, 0.97) 100%), url('https://images.unsplash.com/photo-1686806374120-e7ae3f19801d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsaW5lbiUyMGZhYnJpYyUyMHRleHR1cmUlMjBiZWlnZXxlbnwxfHx8fDE3NjIzMzQ0Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080')`,
      backgroundSize: 'cover',
      backgroundAttachment: 'fixed'
    }}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <ChefHat className="w-12 h-12" style={{ color: '#6b8e6f' }} />
          <h1 style={{ color: '#6b8e6f' }}>Cucina</h1>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Log in to access your recipes</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="Enter your username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Log In'}
                  </Button>
                </form>
                <div className="mt-4 p-3 bg-amber-50 rounded-md">
                  <p className="text-sm text-amber-800">
                    <strong>Demo:</strong> username: demo, password: demo
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Sign up to start organizing your recipes</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username</Label>
                    <Input
                      id="signup-username"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      placeholder="Choose a username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Choose a password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      value={signupConfirm}
                      onChange={(e) => setSignupConfirm(e.target.value)}
                      placeholder="Confirm your password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing up...' : 'Sign Up'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Toaster />
    </div>
  );
}
