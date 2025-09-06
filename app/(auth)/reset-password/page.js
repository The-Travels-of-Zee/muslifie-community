"use client";

import { useState, useEffect, useRef } from "react";
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft, Mail } from "lucide-react";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail, resetPassword } from "@/lib/actions/authActions";
import { useAuthStore } from "@/stores/useAuthStore";

// Zod validation schemas
const emailSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit OTP"),
});

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters long"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function ResetPasswordPage() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const inputRefs = useRef([]);

  // Form states
  const [step, setStep] = useState(1); // 1: email, 2: otp + password, 3: success
  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleOtpChange = (value) => {
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 6);
    handleInputChange("otp", numericValue);
  };

  // Step 1: Send OTP to email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      emailSchema.parse({ email: formData.email });

      const result = await sendPasswordResetEmail(formData.email);

      if (result.success) {
        setStep(2);
        setResendCooldown(60);
      } else {
        setErrors({ email: result.error || "Failed to send OTP. Please try again." });
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
        setErrors({ email: "An unexpected error occurred. Please try again." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsResending(true);
    setErrors({});

    try {
      const result = await sendPasswordResetEmail(formData.email);
      if (result.success) {
        setResendCooldown(60);
        setFormData((prev) => ({ ...prev, otp: "" }));
      } else {
        setErrors({ otp: result.error || "Failed to resend OTP" });
      }
    } catch (error) {
      setErrors({ otp: "Failed to resend OTP. Please try again." });
    } finally {
      setIsResending(false);
    }
  };

  // Step 2: Verify OTP and reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      // Validate OTP
      otpSchema.parse({ otp: formData.otp });

      // Validate passwords
      resetPasswordSchema.parse({
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      });

      const result = await resetPassword(formData.email, formData.otp, formData.password);

      if (result.success) {
        setStep(3);
        await logout();
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setErrors({ submit: result.error || "Failed to reset password. Please try again." });
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
        setErrors({ submit: "An unexpected error occurred. Please try again." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Left Side - Welcome Section */}
        <div className="bg-gradient-to-br from-secondary to-primary py-12 px-8 lg:py-24 lg:px-12 text-white relative overflow-hidden flex flex-col justify-center items-center lg:items-start">
          {/* Back Button */}
          <Link href="/login" className="absolute top-8 left-8 p-2 hover:bg-white/20 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>

          {/* Decorative Circles */}
          <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-sm" />
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full blur-sm" />

          <div className="relative z-10 flex flex-col items-center lg:items-start">
            {/* Logo */}
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-8">
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="text-center lg:text-left">
              <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                Reset Your
                <br />
                <span className="text-accent">Password</span>
              </h1>
              <p className="text-lg text-emerald-100 max-w-md">
                {step === 1 && "Enter your email address to receive a verification code."}
                {step === 2 && "Enter the verification code and create your new password."}
                {step === 3 && "Your password has been successfully reset!"}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Form Section */}
        <div className="p-8 lg:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full">
            {/* Step 1: Email Input */}
            {step === 1 && (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Forgot Password?</h2>
                  <p className="text-gray-600">Enter your email to receive a verification code</p>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
                      <input
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        disabled={isLoading}
                        className={`w-full pl-12 pr-4 py-4 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 bg-white placeholder-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                          errors.email
                            ? "border-red-300 focus:border-red-500"
                            : "border-gray-200 focus:border-secondary"
                        }`}
                      />
                    </div>
                    {errors.email && <p className="text-red-500 text-sm mt-1 ml-1">{errors.email}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-secondary to-primary text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending OTP...</span>
                      </div>
                    ) : (
                      "Send Verification Code"
                    )}
                  </button>
                </form>
              </>
            )}

            {/* Step 2: OTP and Password Reset */}
            {step === 2 && (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Verify & Reset</h2>
                  <p className="text-gray-600">
                    Enter the 6-digit code sent to{" "}
                    <span className="font-semibold text-secondary">{formData.email}</span>
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-6">
                  {/* OTP Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
                    <div className="flex justify-between gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <input
                          key={i}
                          ref={(el) => (inputRefs.current[i] = el)}
                          type="text"
                          maxLength={1}
                          value={formData.otp[i] || ""}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, "");
                            const otpArray = formData.otp.split("");
                            otpArray[i] = val;
                            handleOtpChange(otpArray.join(""));

                            if (val && i < 5) {
                              inputRefs.current[i + 1]?.focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Backspace" && !formData.otp[i] && i > 0) {
                              inputRefs.current[i - 1]?.focus();
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pastedData = e.clipboardData
                              .getData("text")
                              .replace(/[^0-9]/g, "")
                              .slice(0, 6);
                            handleOtpChange(pastedData);
                            const nextIndex = Math.min(pastedData.length, 5);
                            inputRefs.current[nextIndex]?.focus();
                          }}
                          className={`w-12 h-12 text-center text-lg border-2 rounded-xl focus:outline-none transition-colors ${
                            errors.otp
                              ? "border-red-300 focus:border-red-500"
                              : "border-gray-200 focus:border-secondary"
                          }`}
                          disabled={isLoading}
                        />
                      ))}
                    </div>
                    {errors.otp && <p className="text-red-500 text-sm mt-1 ml-1">{errors.otp}</p>}

                    {/* Resend OTP */}
                    <div className="text-center mt-3">
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isResending || resendCooldown > 0}
                        className="text-sm text-primary hover:text-secondary font-semibold underline disabled:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isResending
                          ? "Sending..."
                          : resendCooldown > 0
                          ? `Resend in ${resendCooldown}s`
                          : "Resend Code"}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        disabled={isLoading}
                        className={`w-full pl-12 pr-12 py-4 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 bg-white placeholder-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                          errors.password
                            ? "border-red-300 focus:border-red-500"
                            : "border-gray-200 focus:border-secondary"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-secondary transition-colors disabled:cursor-not-allowed"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-500 text-sm mt-1 ml-1">{errors.password}</p>}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        disabled={isLoading}
                        className={`w-full pl-12 pr-12 py-4 border-2 rounded-xl focus:outline-none transition-colors text-gray-900 bg-white placeholder-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                          errors.confirmPassword
                            ? "border-red-300 focus:border-red-500"
                            : "border-gray-200 focus:border-secondary"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-secondary transition-colors disabled:cursor-not-allowed"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-sm mt-1 ml-1">{errors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Password Requirements */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 font-semibold mb-2">Password Requirements:</p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• At least 8 characters long</li>
                      <li>• Use a mix of letters, numbers, and symbols</li>
                      <li>• Avoid common words or personal info</li>
                    </ul>
                  </div>

                  {/* Submit Error */}
                  {errors.submit && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-600 text-sm">{errors.submit}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-secondary to-primary text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Resetting Password...</span>
                      </div>
                    ) : (
                      "Reset Password"
                    )}
                  </button>

                  {/* Back to email step */}
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                    className="w-full text-gray-600 py-2 text-sm hover:text-secondary transition-colors disabled:cursor-not-allowed"
                  >
                    Change email address
                  </button>
                </form>
              </>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                </div>

                <div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-4">Password Reset Successful!</h2>
                  <p className="text-gray-600 mb-4">
                    Your password has been successfully reset. You can now log in with your new password.
                  </p>
                  <p className="text-sm text-gray-500">You will be redirected to the login page in a few seconds...</p>
                </div>

                <Link
                  href="/login"
                  className="block w-full bg-gradient-to-r from-secondary to-primary text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 text-center hover:scale-105"
                >
                  Go to Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
