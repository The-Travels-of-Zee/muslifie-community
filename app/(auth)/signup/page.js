"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUpUserWithEmail, signInWithGoogle } from "@/lib/actions/authActions";
import { useAuthStore } from "@/stores/useAuthStore";
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/config';

// Zod validation schema
const signUpSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function SignUpUserPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const validatedData = signUpSchema.parse(formData);

      const result = await signUpUserWithEmail(validatedData.email, validatedData.password, {
        name: validatedData.fullName,
      });

      if (result.success) {
        if (result.requiresEmailVerification) {
          // Email verification required - redirect to OTP page
          router.push(
            `/otp-confirm?email=${encodeURIComponent(validatedData.email)}&type=signup&token=${encodeURIComponent(
              result.token
            )}`
          );
        } else if (result.user) {
          // Set user in store if login was successful
          setUser(result.user);
          router.push("/");
        }
      } else {
        setErrors({ submit: result.error || "An error occurred during signup" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
      } else {
        setErrors({ submit: error.message || "An error occurred during signup" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Updated Google Sign Up function
  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setErrors({});
    
    try {
      // Firebase Google sign-in
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Get ID token
      const idToken = await user.getIdToken();
      
      // Call your server action with traveler as default userType for web
      const authResult = await signInWithGoogle(idToken, 'traveler');
      
      if (authResult.success) {
        if (authResult.user) {
          setUser(authResult.user);
          router.push("/");
        }
      } else {
        // Handle different error types
        if (authResult.existingUserType && authResult.requestedUserType) {
          setErrors({ 
            submit: `Account exists as ${authResult.existingUserType}. Please sign in as ${authResult.existingUserType} instead.` 
          });
        } else {
          setErrors({ submit: authResult.error || "Google sign-up failed" });
        }
      }
    } catch (error) {
      console.error('Google sign-up error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        setErrors({ submit: 'Sign-up cancelled' });
      } else if (error.code === 'auth/popup-blocked') {
        setErrors({ submit: 'Popup blocked. Please allow popups for this site.' });
      } else {
        setErrors({ submit: error.message || 'Google sign-up failed' });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.8, staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" },
    },
  };

  const floatingVariants = {
    animate: {
      y: [0, -10, 0],
      transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted via-white to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          variants={floatingVariants}
          animate="animate"
          className="absolute top-20 right-20 w-32 h-32 bg-primary/10 rounded-full blur-xl"
        />
        <motion.div
          variants={floatingVariants}
          animate="animate"
          style={{ animationDelay: "1s" }}
          className="absolute bottom-20 left-20 w-40 h-40 bg-secondary/5 rounded-full blur-xl"
        />
        <motion.div
          variants={floatingVariants}
          animate="animate"
          style={{ animationDelay: "2s" }}
          className="absolute top-1/3 left-10 w-24 h-24 bg-accent/20 rounded-full blur-lg"
        />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-6xl grid lg:grid-cols-2 bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white/20 relative z-10"
      >
        {/* Left Side - Welcome Section */}
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-br from-primary via-primary to-secondary p-8 lg:p-12 flex flex-col justify-center text-white relative overflow-hidden"
        >
          <Link href="/" className="absolute top-4 left-4 p-2 hover:bg-white/20 rounded-full transition-colors z-10">
            <ArrowLeft className="w-6 h-6" />
          </Link>

          {/* Decorative Patterns */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 right-20 w-32 h-32 border-2 border-white/30 rounded-full" />
            <div className="absolute top-32 right-32 w-16 h-16 border border-white/20 rounded-full" />
            <div className="absolute bottom-20 left-20 w-24 h-24 border border-white/20 rotate-45 rounded-lg" />
            <div className="absolute bottom-32 left-32 w-12 h-12 border border-white/30 rotate-45 rounded-lg" />
          </div>

          <div className="relative z-10">
            <motion.div
              variants={itemVariants}
              className="w-20 h-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center my-6 mx-auto lg:mx-0"
            >
              <img src="/favicon/logo.png" width={48} height={48} alt="muslifie-logo" />
            </motion.div>

            <motion.div variants={itemVariants} className="text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                Join the
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300">
                  Muslifie Community
                </span>
              </h1>
              <p className="text-lg text-slate-200 max-w-md mb-6">
                Start your halal-friendly travel journey today. Discover food, prayer spaces, and connect with the ummah
                worldwide.
              </p>
            </motion.div>
            <motion.div
              variants={itemVariants}
              className="mt-10 flex max-w-sm items-center justify-center lg:justify-start space-x-4"
            >
              <Link href="https://apps.apple.com/pk/app/muslifie/id6749224199" target="_blank">
                <img
                  src="/stores/app-store.svg"
                  width={120}
                  height={120}
                  alt="muslifie-logo"
                  className="inline w-full h-12 lg:h-16"
                />
              </Link>
              <Link
                href="https://play.google.com/store/apps/details?id=com.app.muslifie&pcampaignid=web_share"
                target="_blank"
              >
                <img
                  src="/stores/google-play.svg"
                  width={120}
                  height={120}
                  alt="muslifie-logo"
                  className="inline w-full h-12 lg:h-16"
                />
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Side - Form */}
        <motion.div variants={itemVariants} className="p-8 lg:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <motion.div variants={itemVariants} className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Create your account</h2>
              <p className="text-gray-600">Fill in your details to get started</p>
            </motion.div>

            {errors.submit && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm"
              >
                {errors.submit}
              </motion.div>
            )}

            <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 border-2 rounded-2xl focus:outline-none transition-all duration-300 ${
                      errors.fullName
                        ? "border-red-300 focus:border-red-500 bg-red-50"
                        : "border-slate-200 focus:border-blue-500 bg-slate-50 focus:bg-white"
                    }`}
                    disabled={isLoading}
                  />
                </div>
                {errors.fullName && <p className="text-red-500 text-sm mt-2 ml-1">{errors.fullName}</p>}
              </div>

              {/* Email */}
              <div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`w-full pl-12 pr-4 py-4 border-2 rounded-2xl focus:outline-none transition-all duration-300 ${
                      errors.email
                        ? "border-red-300 focus:border-red-500 bg-red-50"
                        : "border-slate-200 focus:border-blue-500 bg-slate-50 focus:bg-white"
                    }`}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && <p className="text-red-500 text-sm mt-2 ml-1">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className={`w-full pl-12 pr-12 py-4 border-2 rounded-2xl focus:outline-none transition-all duration-300 ${
                      errors.password
                        ? "border-red-300 focus:border-red-500 bg-red-50"
                        : "border-slate-200 focus:border-blue-500 bg-slate-50 focus:bg-white"
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-sm mt-2 ml-1">{errors.password}</p>}
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isLoading || isGoogleLoading}
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary text-white py-4 rounded-2xl font-medium text-lg shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating account...</span>
                  </div>
                ) : (
                  "Create Account"
                )}
              </motion.button>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-600">or continue with</span>
                </div>
              </div>

              {/* Google Sign Up */}
              <motion.button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={isLoading || isGoogleLoading}
                whileHover={{ scale: isGoogleLoading ? 1 : 1.02 }}
                whileTap={{ scale: isGoogleLoading ? 1 : 0.98 }}
                className="w-full border-2 border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 py-4 rounded-2xl font-medium text-lg transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGoogleLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span>Signing up...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>Sign up with Google</span>
                  </>
                )}
              </motion.button>

              {/* Already have account */}
              <motion.div variants={itemVariants} className="text-center mt-8">
                <p className="text-slate-600">
                  Already have an account?{" "}
                  <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                    Log in instead
                  </Link>
                </p>
              </motion.div>
            </motion.form>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}