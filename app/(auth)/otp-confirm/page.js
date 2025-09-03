"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { confirmEmailOTP, resendEmailOTP } from "@/lib/actions/authActions";
import { useAuthStore } from "@/stores/useAuthStore";

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit OTP"),
});

export default function OtpConfirmPage() {
  const router = useRouter();
  const { setUser, checkAuthStatus } = useAuthStore();
  const [formData, setFormData] = useState({ otp: "" });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpConfirmed, setIsOtpConfirmed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");

  const inputRefs = useRef([]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get("email");
    const tokenParam = urlParams.get("token");

    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
      // Optionally, you can store the token in state if needed for resend
      setToken(tokenParam);
    } else {
      // Redirect to signup if no email is provided
      router.push("/signup");
    }
  }, [router]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleInputChange = (value) => {
    const numericValue = value.replace(/[^0-9]/g, "").slice(0, 6);
    setFormData({ otp: numericValue });
    if (errors["otp"]) setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      otpSchema.parse(formData);
      const result = await confirmEmailOTP(email, formData.otp, token);

      if (result.success) {
        setIsOtpConfirmed(true);

        // Set user in store if provided
        if (result.user) {
          setUser(result.user);
        }

        // Check auth status to ensure cookies are set
        await checkAuthStatus();

        // Redirect after a short delay to show success message
        setTimeout(() => {
          router.push("/");
        }, 2000);
      } else {
        setErrors({ otp: result.error || "Invalid verification code" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors({ otp: "Enter a valid 6-digit code" });
      } else {
        setErrors({ otp: error.message || "Verification failed" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !email) return;
    setIsResending(true);
    setErrors({});
    try {
      const result = await resendEmailOTP(email, token);
      if (result.success) {
        setResendCooldown(60);
        // Clear the OTP input
        setFormData({ otp: "" });
      } else {
        setErrors({ otp: result.error || "Failed to resend code" });
      }
    } catch (error) {
      setErrors({ otp: "Failed to resend code. Please try again." });
    } finally {
      setIsResending(false);
    }
  };

  if (!email) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-6xl grid lg:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Left Section */}
        <div className="bg-gradient-to-br from-secondary to-primary py-8 lg:py-24 px-12 relative text-white flex flex-col justify-center">
          <Link href="/signup" className="absolute top-8 left-8 p-2 hover:bg-white/20 rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </Link>

          <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-lg" />
          <div className="absolute bottom-20 left-20 w-24 h-24 bg-white/10 rounded-full blur-lg" />

          <div className="relative z-10 space-y-6 text-center lg:text-left">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto lg:mx-0 shadow-lg">
              <img src="/favicon/logo.png" width={56} height={56} alt="logo" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
              Verify Your <br />
              <span className="bg-gradient-to-r from-emerald-200 to-teal-300 bg-clip-text text-transparent">Email</span>
            </h1>
            <p className="text-lg text-emerald-100">
              Enter the 6-digit code we sent to <span className="font-semibold">{email}</span> to activate your account.
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="p-8 lg:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            {!isOtpConfirmed ? (
              <>
                <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">Enter Verification Code</h2>
                <p className="text-gray-600 text-center mb-8">
                  We&apos;ve sent a 6-digit code to your email. Please enter it below.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* OTP Input */}
                  <div className="flex justify-between gap-3">
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
                          handleInputChange(otpArray.join(""));

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
                          handleInputChange(pastedData);
                          // Focus the last filled input or the next empty one
                          const nextIndex = Math.min(pastedData.length, 5);
                          inputRefs.current[nextIndex]?.focus();
                        }}
                        className={`w-12 h-14 text-center text-xl border-2 rounded-xl focus:outline-none transition-colors ${
                          errors.otp ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-secondary"
                        }`}
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                  {errors.otp && <p className="text-red-500 text-sm mt-1 text-center">{errors.otp}</p>}

                  <motion.button
                    type="submit"
                    disabled={isLoading || formData.otp.length !== 6}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-gradient-to-r from-secondary to-primary text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Verifying...</span>
                      </div>
                    ) : (
                      "Verify OTP"
                    )}
                  </motion.button>
                </form>

                <div className="text-center mt-6">
                  <p className="text-gray-600 text-sm">
                    Didn&apos;t get the code?{" "}
                    <button
                      onClick={handleResend}
                      disabled={isResending || resendCooldown > 0}
                      className="text-primary hover:text-secondary font-semibold underline disabled:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isResending ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                    </button>
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-800">
                  🎉 Account{" "}
                  <span className="bg-gradient-to-r from-green-500 to-emerald-400 bg-clip-text text-transparent">
                    Verified!
                  </span>
                </h2>
                <p className="text-gray-600">Redirecting you to your dashboard...</p>
                <div className="flex items-center justify-center gap-2 text-green-600 font-semibold">
                  <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                  Redirecting...
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
