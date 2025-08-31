"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from 'next/navigation';
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// --- Validation Schemas (Your original schemas are perfect for this) ---
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required."),
});

const signUpSchema = loginSchema.extend({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });


// --- FIX 1: Define a new type for the form's state ---
// This type represents all possible fields. `confirmPassword` is optional
// because it only exists in the sign-up state.
type FormValues = z.infer<typeof loginSchema> & {
  confirmPassword?: string;
};


const AuthPage = () => {
  const [isSignUp, setIsSignUp] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // --- FIX 2: Use the new, more flexible `FormValues` type ---
  const form = useForm<FormValues>({
    // This line will now work because `FormValues` is compatible with both schemas
    resolver: zodResolver(isSignUp ? signUpSchema : loginSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "", // Provide a default for all possible fields
    },
  });

  // --- FIX 3: Explicitly type the `values` in onSubmit ---
  // This ensures TypeScript knows which fields are available.
  const onSubmit = async (values: FormValues) => {
    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('password', values.password);

    const apiRoute = isSignUp ? '/api/signup' : '/api/login';

    const response = await fetch(apiRoute, {
      method: 'POST',
      body: formData,
    });

    if (response.redirected) {
      router.push(response.url);
    } else if (!response.ok) {
      const errorData = await response.text();
      toast({
        title: "Authentication Failed",
        description: errorData || "An unknown error occurred.",
        variant: "destructive",
      });
    }
  };

  // The rest of your JSX remains exactly the same
  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
        <div className="flex items-center justify-center py-12">
            <div className="mx-auto grid w-[350px] gap-6">
                <div className="grid gap-2 text-center">
                    <h1 className="text-3xl font-bold">{isSignUp ? "Sign Up" : "Sign In"}</h1>
                    <p className="text-balance text-muted-foreground">
                        {isSignUp ? "Enter your information to create an account" : "Enter your credentials to log in"}
                    </p>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="m@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {isSignUp && (
                            <FormField
                                control={form.control}
                                // The name must be a key of FormValues, which it now is
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm Password</FormLabel>
                                        <FormControl>
                                            {/* We need to handle a potentially undefined value for the input */}
                                            <Input type="password" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <Button type="submit" className="w-full">
                            {isSignUp ? "Create an account" : "Sign In"}
                        </Button>
                    </form>
                </Form>
                <div className="mt-4 text-center text-sm">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                    <Button variant="link" className="underline p-0" onClick={() => setIsSignUp(!isSignUp)}>
                        {isSignUp ? "Sign In" : "Sign Up"}
                    </Button>
                </div>
            </div>
        </div>
        <div className="hidden bg-muted lg:block">
            <img
                src="/placeholder.svg"
                alt="Image"
                width="1920"
                height="1080"
                className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
        </div>
    </div>
  );
};

export default AuthPage;