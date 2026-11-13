import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../utils/translations';
import { supabase } from '../../lib/supabase';
import { normalizeInviteCode } from '../../utils/teamUtils';
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Utensils,
  Mail,
  Key,
  User,
  Store,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowLeft,
  Send,
  Ticket,
  LogOut,
  Users,
} from 'lucide-react';

type AuthMode =
  | 'signin'
  | 'signup'
  | 'staff_signup'
  | 'join_restaurant'
  | 'forgot_password'
  | 'set_new_password';

export const AdminLoginModal: React.FC = () => {
  const {
    user,
    isPendingProfile,
    signInAdmin,
    signUpAdmin,
    signUpStaff,
    signOutAdmin,
    sendPasswordReset,
    updatePassword,
    acceptStaffInvite,
    isPasswordRecoveryMode,
    setIsPasswordRecoveryMode,
    setCurrentView,
    lang,
  } = useApp();
  const { t, isRTL } = useTranslation(lang);

  // Active view mode
  const [mode, setMode] = useState<AuthMode>(() => {
    if (isPasswordRecoveryMode) return 'set_new_password';
    if (isPendingProfile) return 'join_restaurant';
    return 'signin';
  });

  useEffect(() => {
    if (isPasswordRecoveryMode) {
      setMode('set_new_password');
    } else if (isPendingProfile) {
      setMode('join_restaurant');
    }
  }, [isPasswordRecoveryMode, isPendingProfile]);

  useEffect(() => {
    setErrorMessage('');
    if (mode !== 'signin') {
      setSuccessMessage('');
    }
    setSignupPin('');
  }, [mode]);

  // Form inputs (strictly start empty)
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [signupPin, setSignupPin] = useState<string>('');
  const [inviteCode, setInviteCode] = useState<string>('');

  // Password & PIN visibility toggles
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [showPin, setShowPin] = useState<boolean>(false);

  // Status & Feedback
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Brute force rate limiting (5 failed attempts -> 60-second cooldown on signin)
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    const saved = localStorage.getItem('menuqr_failed_auth_attempts');
    return saved ? parseInt(saved, 10) || 0 : 0;
  });
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(() => {
    const lockUntil = localStorage.getItem('menuqr_auth_locked_until');
    if (lockUntil) {
      const remaining = Math.ceil((parseInt(lockUntil, 10) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          localStorage.removeItem('menuqr_auth_locked_until');
          localStorage.setItem('menuqr_failed_auth_attempts', '0');
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const recordFailedAttempt = () => {
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    localStorage.setItem('menuqr_failed_auth_attempts', nextAttempts.toString());

    if (nextAttempts >= 5) {
      const lockUntil = Date.now() + 60 * 1000;
      localStorage.setItem('menuqr_auth_locked_until', lockUntil.toString());
      setCooldownRemaining(60);
    }
  };

  const clearFailedAttempts = () => {
    setFailedAttempts(0);
    setCooldownRemaining(0);
    localStorage.removeItem('menuqr_failed_auth_attempts');
    localStorage.removeItem('menuqr_auth_locked_until');
  };

  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-stone-700', percentage: 0 };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) {
      return {
        score: 1,
        label: lang === 'ar' ? 'ضعيفة (أقل من 8 أحرف)' : lang === 'fr' ? 'Faible (< 8 car.)' : 'Weak (< 8 chars)',
        color: 'bg-red-500',
        percentage: 25,
      };
    } else if (score === 2 || score === 3) {
      return {
        score: 2,
        label: lang === 'ar' ? 'متوسطة ومقبولة' : lang === 'fr' ? 'Moyen / Acceptable' : 'Moderate',
        color: 'bg-amber-500',
        percentage: 65,
      };
    } else {
      return {
        score: 3,
        label: lang === 'ar' ? 'قوية جداً وممتازة' : lang === 'fr' ? 'Forte & Sécurisée' : 'Strong',
        color: 'bg-emerald-500',
        percentage: 100,
      };
    }
  };

  const showConfirmPasswordField =
    mode === 'signup' || mode === 'staff_signup' || mode === 'set_new_password';
  const passwordStrength = calculatePasswordStrength(password);
  const passwordsMatch = showConfirmPasswordField
    ? password.length > 0 && confirmPassword.length > 0 && password === confirmPassword
    : true;
  const passwordsMismatched =
    showConfirmPasswordField && confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (mode === 'signin' && cooldownRemaining > 0) {
      setErrorMessage(
        lang === 'ar'
          ? `تم قفل محاولات تسجيل الدخول مؤقتاً. يرجى الانتظار ${cooldownRemaining} ثانية.`
          : lang === 'fr'
          ? `Trop de tentatives. Veuillez patienter ${cooldownRemaining} secondes.`
          : `Too many attempts. Please wait ${cooldownRemaining} seconds.`
      );
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const res = await signInAdmin(email.trim(), password);
        if (!res.success) {
          recordFailedAttempt();
          setErrorMessage(
            res.error ||
              (lang === 'ar'
                ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
                : lang === 'fr'
                ? 'Email ou mot de passe incorrect'
                : 'Invalid email or password')
          );
        } else {
          clearFailedAttempts();
        }
      } else if (mode === 'signup') {
        if (!signupPin.trim()) {
          setErrorMessage(
            lang === 'ar'
              ? 'يرجى إدخال كود التسجيل (PIN).'
              : lang === 'fr'
              ? "Veuillez saisir votre code PIN d'inscription."
              : 'Please enter your registration PIN code.'
          );
          setLoading(false);
          return;
        }

        if (password.length < 8) {
          setErrorMessage(
            lang === 'ar'
              ? 'يجب ألا تقل كلمة المرور عن 8 أحرف لضمان أمان حسابك.'
              : lang === 'fr'
              ? 'Le mot de passe doit comporter au moins 8 caractères.'
              : 'Password must be at least 8 characters.'
          );
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setErrorMessage(
            lang === 'ar'
              ? 'كلمتا المرور غير متطابقتين.'
              : lang === 'fr'
              ? 'Les mots de passe ne correspondent pas.'
              : 'Passwords do not match.'
          );
          setLoading(false);
          return;
        }

        const pinToVerify = signupPin.trim();

        try {
          const { data: isValidPin, error: pinRpcError } = await supabase.rpc('verify_signup_pin', {
            p_pin: pinToVerify,
          });

          if (pinRpcError) {
            const errLower = (pinRpcError.message || '').toLowerCase();
            if (errLower.includes('too_many_attempts')) {
              setErrorMessage(
                lang === 'ar'
                  ? 'محاولات كثيرة خاطئة، يرجى المحاولة بعد 15 دقيقة.'
                  : lang === 'fr'
                  ? 'Trop de tentatives, réessayez dans 15 minutes.'
                  : 'Too many attempts, try again in 15 minutes.'
              );
            } else {
              setErrorMessage(
                lang === 'ar'
                  ? 'كود التسجيل (PIN) غير صالح أو منتهي الصلاحية.'
                  : lang === 'fr'
                  ? 'Code PIN invalide ou expiré.'
                  : 'Invalid or expired PIN.'
              );
            }
            setSignupPin('');
            setLoading(false);
            return;
          }

          if (isValidPin !== true) {
            setErrorMessage(
              lang === 'ar'
                ? 'كود التسجيل (PIN) غير صالح أو منتهي الصلاحية.'
                : lang === 'fr'
                ? 'Code PIN invalide ou expiré.'
                : 'Invalid or expired PIN.'
            );
            setSignupPin('');
            setLoading(false);
            return;
          }
        } catch (err: any) {
          const errLower = (err?.message || '').toLowerCase();
          if (errLower.includes('too_many_attempts')) {
            setErrorMessage(
              lang === 'ar'
                ? 'محاولات كثيرة خاطئة، يرجى المحاولة بعد 15 دقيقة.'
                : lang === 'fr'
                ? 'Trop de tentatives, réessayez dans 15 minutes.'
                : 'Too many attempts, try again in 15 minutes.'
            );
          } else {
            setErrorMessage(
              lang === 'ar'
                ? 'كود التسجيل (PIN) غير صالح أو منتهي الصلاحية.'
                : lang === 'fr'
                ? 'Code PIN invalide ou expiré.'
                : 'Invalid or expired PIN.'
            );
          }
          setSignupPin('');
          setLoading(false);
          return;
        }

        const res = await signUpAdmin(
          email.trim(),
          password,
          fullName.trim(),
          restaurantName.trim(),
          pinToVerify
        );

        setSignupPin('');

        if (!res.success) {
          setErrorMessage(
            res.error ||
              (lang === 'ar'
                ? 'فشل التسجيل، يرجى التأكد من كود التسجيل (PIN) والمحاولة مجدداً'
                : lang === 'fr'
                ? "Échec de l'inscription, vérifiez votre code PIN et réessayez"
                : 'Registration failed, check your PIN and try again')
          );
        } else if (res.requireEmailConfirmation || res.message) {
          setSuccessMessage(res.message || '');
          setMode('signin');
          clearFailedAttempts();
        } else {
          clearFailedAttempts();
        }
      } else if (mode === 'staff_signup') {
        if (fullName.trim().length < 2) {
          setErrorMessage(
            lang === 'ar'
              ? 'يرجى إدخال الاسم الكامل (حرفين على الأقل).'
              : lang === 'fr'
              ? 'Veuillez saisir votre nom complet (au moins 2 caractères).'
              : 'Please enter your full name (at least 2 characters).'
          );
          setLoading(false);
          return;
        }

        if (password.length < 8) {
          setErrorMessage(
            lang === 'ar'
              ? 'يجب ألا تقل كلمة المرور عن 8 أحرف.'
              : lang === 'fr'
              ? 'Le mot de passe doit contenir au moins 8 caractères.'
              : 'Password must be at least 8 characters.'
          );
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setErrorMessage(
            lang === 'ar'
              ? 'كلمتا المرور غير متطابقتين.'
              : lang === 'fr'
              ? 'Les mots de passe ne correspondent pas.'
              : 'Passwords do not match.'
          );
          setLoading(false);
          return;
        }

        const res = await signUpStaff(email.trim(), password, fullName.trim());
        if (!res.success) {
          setErrorMessage(
            res.error ||
              (lang === 'ar'
                ? 'تعذر إنشاء الحساب. يرجى المحاولة مرة أخرى.'
                : lang === 'fr'
                ? 'Impossible de créer le compte. Veuillez réessayer.'
                : 'Could not create account. Please try again.')
          );
        } else if (res.requireEmailConfirmation || res.message) {
          setSuccessMessage(res.message || '');
          setMode('signin');
        } else {
          // Session active without profile -> switch to Join a restaurant screen
          setMode('join_restaurant');
        }
      } else if (mode === 'join_restaurant') {
        const normalized = normalizeInviteCode(inviteCode);
        if (!normalized) {
          setErrorMessage(
            lang === 'ar'
              ? 'يرجى إدخال كود الدعوة.'
              : lang === 'fr'
              ? "Veuillez saisir le code d'invitation."
              : 'Please enter the invitation code.'
          );
          setLoading(false);
          return;
        }

        const res = await acceptStaffInvite(normalized);
        if (!res.success) {
          setErrorMessage(
            res.error ||
              (lang === 'ar'
                ? 'كود الدعوة غير صالح أو منتهي الصلاحية.'
                : lang === 'fr'
                ? "Code d'invitation invalide ou expiré."
                : 'Invalid or expired invitation code.')
          );
        }
      } else if (mode === 'forgot_password') {
        const res = await sendPasswordReset(email.trim());
        if (!res.success) {
          setErrorMessage(
            res.error ||
              (lang === 'ar'
                ? 'تعذر إرسال رابط الاستعادة.'
                : lang === 'fr'
                ? "Impossible d'envoyer le lien."
                : 'Failed to send reset link.')
          );
        } else {
          setSuccessMessage(
            lang === 'ar'
              ? 'تم إرسال رابط استعادة كلمة المرور بنجاح إلى بريدك الإلكتروني! يرجى مراجعة صندوق الوارد ومجلد Spam.'
              : lang === 'fr'
              ? 'Un lien de réinitialisation a été envoyé à votre adresse email ! Vérifiez votre boîte de réception.'
              : 'A password reset link has been sent to your email. Please check your inbox.'
          );
        }
      } else if (mode === 'set_new_password') {
        if (password.length < 8) {
          setErrorMessage(
            lang === 'ar'
              ? 'يجب ألا تقل كلمة المرور الجديدة عن 8 أحرف.'
              : lang === 'fr'
              ? 'Le nouveau mot de passe doit comporter au moins 8 caractères.'
              : 'New password must be at least 8 characters.'
          );
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setErrorMessage(
            lang === 'ar'
              ? 'كلمتا المرور غير متطابقتين.'
              : lang === 'fr'
              ? 'Les mots de passe ne correspondent pas.'
              : 'Passwords do not match.'
          );
          setLoading(false);
          return;
        }

        const res = await updatePassword(password);
        if (!res.success) {
          setErrorMessage(
            res.error ||
              (lang === 'ar'
                ? 'تعذر تحديث كلمة المرور.'
                : lang === 'fr'
                ? 'Impossible de mettre à jour le mot de passe.'
                : 'Failed to update password.')
          );
        } else {
          setIsPasswordRecoveryMode(false);
          setSuccessMessage(
            lang === 'ar'
              ? 'تم تحديث كلمة المرور بنجاح! جاري تحويلك إلى لوحة التحكم...'
              : lang === 'fr'
              ? 'Mot de passe mis à jour avec succès ! Redirection en cours...'
              : 'Password updated successfully! Redirecting...'
          );
        }
      }
    } catch {
      setErrorMessage(
        lang === 'ar'
          ? 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.'
          : lang === 'fr'
          ? "Une erreur s'est produite. Veuillez réessayer."
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInviteCodeChange = (raw: string) => {
    setInviteCode(normalizeInviteCode(raw));
  };

  const handleInviteCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted) {
      e.preventDefault();
      setInviteCode(normalizeInviteCode(pasted));
    }
  };

  const getTitle = () => {
    if (lang === 'ar') {
      switch (mode) {
        case 'signin':
          return 'تسجيل دخول لوحة الإدارة';
        case 'signup':
          return 'إنشاء مطعمي الجديد';
        case 'staff_signup':
          return 'إنشاء حساب للانضمام لفريق';
        case 'join_restaurant':
          return 'الانضمام إلى مطعم';
        case 'forgot_password':
          return 'استعادة كلمة المرور';
        case 'set_new_password':
          return 'تعيين كلمة مرور جديدة';
      }
    }
    if (lang === 'fr') {
      switch (mode) {
        case 'signin':
          return 'Connexion Restaurant';
        case 'signup':
          return 'Créer mon restaurant';
        case 'staff_signup':
          return 'Créer un compte équipier';
        case 'join_restaurant':
          return 'Rejoindre un restaurant';
        case 'forgot_password':
          return 'Mot de passe oublié';
        case 'set_new_password':
          return 'Nouveau mot de passe';
      }
    }
    switch (mode) {
      case 'signin':
        return t.adminLogin;
      case 'signup':
        return 'Create My Restaurant';
      case 'staff_signup':
        return 'Create Staff Account';
      case 'join_restaurant':
        return 'Join a Restaurant';
      case 'forgot_password':
        return 'Forgot Password';
      case 'set_new_password':
        return 'Set New Password';
    }
  };

  const getSubtitle = () => {
    if (lang === 'ar') {
      switch (mode) {
        case 'signin':
          return 'الوصول الآمن إلى لوحة تحكم المطعم، متابعة الطلبات، وإدارة الطاولات';
        case 'signup':
          return 'أنشئ حسابك ومطعمك الرقمي فوراً مع 6 طاولات وقائمة طعام جاهزة';
        case 'staff_signup':
          return 'أنشئ حسابك الشخصي أولاً، ثم أدخل كود الدعوة للانضمام إلى المطعم';
        case 'join_restaurant':
          return 'أدخل كود الدعوة المقدم لك من مدير المطعم للانضمام إلى فريق العمل';
        case 'forgot_password':
          return 'أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور';
        case 'set_new_password':
          return 'اختر كلمة مرور قوية مكونة من 8 أحرف على الأقل لحماية حسابك';
      }
    }
    if (lang === 'fr') {
      switch (mode) {
        case 'signin':
          return 'Accédez au tableau de bord, aux commandes et aux tables de votre restaurant';
        case 'signup':
          return 'Configurez votre restaurant digital avec 6 tables et un menu de démarrage';
        case 'staff_signup':
          return "Créez votre compte personnel puis saisissez le code d'invitation reçu";
        case 'join_restaurant':
          return "Saisissez le code d'invitation fourni par le gérant du restaurant";
        case 'forgot_password':
          return 'Saisissez votre adresse email pour recevoir le lien de réinitialisation';
        case 'set_new_password':
          return "Définissez un mot de passe d'au moins 8 caractères pour sécuriser votre compte";
      }
    }
    switch (mode) {
      case 'signin':
        return 'Access your restaurant dashboard, orders, and table management';
      case 'signup':
        return 'Set up your digital restaurant with 6 tables and a starter menu ready';
      case 'staff_signup':
        return 'Create your account first, then enter your invitation code on the next step';
      case 'join_restaurant':
        return 'Enter the invitation code provided by your restaurant manager';
      case 'forgot_password':
        return 'Enter your email to receive a password recovery link';
      case 'set_new_password':
        return 'Set a secure password with at least 8 characters';
    }
  };

  return (
    <div
      className="min-h-screen bg-stone-900 flex items-center justify-center p-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-md bg-stone-950 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-stone-100 flex flex-col items-center">
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-orange-600/20 text-[#FF5A1F] border border-orange-500/30 flex items-center justify-center mb-4 shadow-sm">
          {mode === 'forgot_password' || mode === 'set_new_password' ? (
            <Key className="w-8 h-8" />
          ) : mode === 'join_restaurant' ? (
            <Ticket className="w-8 h-8" />
          ) : mode === 'staff_signup' ? (
            <Users className="w-8 h-8" />
          ) : (
            <Lock className="w-8 h-8" />
          )}
        </div>

        {/* Screen Title */}
        <h2 className="text-2xl font-black tracking-tight text-white text-center">{getTitle()}</h2>

        {/* Screen Subtitle */}
        <p className="text-xs text-stone-300 mt-1.5 text-center max-w-xs leading-relaxed">
          {getSubtitle()}
        </p>

        {/* Mode Switcher Tabs for Signin / Restaurant Signup */}
        {(mode === 'signin' || mode === 'signup') && (
          <div className="w-full grid grid-cols-2 p-1 bg-stone-900 rounded-xl mt-4 border border-stone-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-stone-800 text-white shadow-xs font-bold'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              {lang === 'ar' ? 'تسجيل الدخول' : lang === 'fr' ? 'Connexion' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-stone-800 text-white shadow-xs font-bold'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              {lang === 'ar'
                ? 'إنشاء مطعمي'
                : lang === 'fr'
                ? 'Créer mon restaurant'
                : 'Create Restaurant'}
            </button>
          </div>
        )}

        {/* Signed-in user context banner on Join a restaurant screen */}
        {mode === 'join_restaurant' && user && (
          <div className="w-full mt-4 p-3 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-orange-500/15 text-[#FF5A1F] flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-stone-400">
                  {lang === 'ar' ? 'مسجل الدخول بالحساب' : lang === 'fr' ? 'Connecté en tant que' : 'Signed in as'}
                </p>
                <p className="font-mono text-stone-100 font-bold truncate">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={signOutAdmin}
              className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-red-950/60 text-stone-200 hover:text-red-300 border border-stone-700/80 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'خروج' : lang === 'fr' ? 'Déconnexion' : 'Sign Out'}</span>
            </button>
          </div>
        )}

        {/* Security Notice when in restaurant signup mode */}
        {mode === 'signup' && (
          <div className="w-full mt-3 p-3 rounded-xl bg-orange-950/20 border border-orange-800/40 text-orange-200 text-[11px] leading-relaxed flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#FF5A1F] shrink-0 mt-0.5" />
            <span>
              {lang === 'ar'
                ? 'سيتم إعداد مطعمك الجديد تلقائياً. للانضمام إلى فريق مطعم قائم، استخدم رابط "لدي كود دعوة" في شاشة الدخول.'
                : lang === 'fr'
                ? 'Votre nouvel espace restaurant sera configuré automatiquement. Pour rejoindre une équipe, utilisez « J’ai un code d’invitation ».'
                : 'A dedicated workspace will be created for your restaurant. To join an existing team, use "I have an invitation code" on sign in.'}
            </span>
          </div>
        )}

        {/* Brute-force Cooldown Banner */}
        {mode === 'signin' && cooldownRemaining > 0 && (
          <div className="w-full mt-4 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-center gap-2.5 animate-in fade-in">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-spin" />
            <div>
              <p className="font-bold text-amber-300">
                {lang === 'ar'
                  ? 'تم قفل المحاولات مؤقتاً لأسباب أمنية'
                  : lang === 'fr'
                  ? 'Tentatives verrouillées temporairement'
                  : 'Attempts temporarily locked'}
              </p>
              <p className="text-[11px] text-amber-200/90 mt-0.5">
                {lang === 'ar'
                  ? `يرجى الانتظار ${cooldownRemaining} ثانية قبل إعادة المحاولة.`
                  : lang === 'fr'
                  ? `Veuillez patienter ${cooldownRemaining} secondes avant de réessayer.`
                  : `Please wait ${cooldownRemaining} seconds before trying again.`}
              </p>
            </div>
          </div>
        )}

        {/* Error Notification Alert */}
        {errorMessage && (
          <div className="w-full mt-4 p-3.5 rounded-2xl bg-red-950/50 border border-red-800/70 text-red-100 text-xs flex flex-col gap-1.5 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {lang === 'ar'
                  ? 'تنبيه'
                  : lang === 'fr'
                  ? 'Attention'
                  : 'Notice'}
              </span>
            </div>
            <p className="text-[12px] text-red-200 leading-relaxed ps-6">{errorMessage}</p>
          </div>
        )}

        {/* Success Notification Alert */}
        {successMessage && (
          <div className="w-full mt-4 p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-800/70 text-emerald-100 text-xs flex flex-col gap-1.5 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {lang === 'ar' ? 'تمت العملية بنجاح' : lang === 'fr' ? 'Succès' : 'Success'}
              </span>
            </div>
            <p className="text-[12px] text-emerald-200 leading-relaxed ps-6">{successMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full mt-4 space-y-3.5 text-xs">
          {/* RESTAURANT SIGNUP FIELDS */}
          {mode === 'signup' && (
            <>
              <div>
                <label className="font-bold text-stone-300 uppercase text-[10px] block mb-1">
                  {lang === 'ar'
                    ? 'اسم المطعم'
                    : lang === 'fr'
                    ? 'Nom du Restaurant'
                    : 'Restaurant Name'}
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-stone-400" />
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={100}
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: مطعم الأصيل' : 'e.g. Le Gourmet Bistro'}
                    className="w-full h-11 ps-9 pe-3 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-300 uppercase text-[10px] block mb-1">
                  {lang === 'ar'
                    ? 'الاسم الكامل للمدير'
                    : lang === 'fr'
                    ? 'Nom du Gérant'
                    : 'Owner / Manager Name'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-stone-400" />
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: أحمد حمادوش' : 'e.g. Younes Hamadouch'}
                    className="w-full h-11 ps-9 pe-3 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-stone-300 uppercase text-[10px] flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#FF5A1F]" />
                    <span>
                      {lang === 'ar'
                        ? 'كود التسجيل (PIN)'
                        : lang === 'fr'
                        ? "Code PIN d'inscription"
                        : 'Registration PIN Code'}
                    </span>
                    <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-stone-400" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
                    value={signupPin}
                    onChange={(e) => setSignupPin(e.target.value)}
                    placeholder="••••••"
                    autoComplete="off"
                    className="w-full h-11 ps-9 pe-10 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute inset-y-0 end-3 my-auto text-stone-300 hover:text-white transition-colors cursor-pointer"
                    title={showPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  {lang === 'ar'
                    ? 'اطلب كود التسجيل من إدارة المنصة لتفعيل حساب المطعم'
                    : lang === 'fr'
                    ? "Demandez votre code d'inscription à la plateforme"
                    : 'Ask the platform for your registration code'}
                </p>
              </div>
            </>
          )}

          {/* STAFF SIGNUP: Full Name only (NO restaurant name, NO PIN) */}
          {mode === 'staff_signup' && (
            <div>
              <label className="font-bold text-stone-300 uppercase text-[10px] block mb-1">
                {lang === 'ar'
                  ? 'الاسم الكامل'
                  : lang === 'fr'
                  ? 'Nom complet'
                  : 'Full Name'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-stone-400" />
                <input
                  type="text"
                  required
                  minLength={2}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={lang === 'ar' ? 'مثال: كريم بن علي' : 'e.g. Karim Benali'}
                  className="w-full h-11 ps-9 pe-3 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* JOIN RESTAURANT: Invitation Code Input */}
          {mode === 'join_restaurant' && (
            <div>
              <label className="font-bold text-stone-300 uppercase text-[10px] block mb-1.5">
                {lang === 'ar'
                  ? 'كود الدعوة'
                  : lang === 'fr'
                  ? "Code d'invitation"
                  : 'Invitation Code'}
              </label>
              <div className="relative">
                <Ticket className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-[#FF5A1F]" />
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => handleInviteCodeChange(e.target.value)}
                  onPaste={handleInviteCodePaste}
                  placeholder="STF-XXXX-XXXX"
                  dir="ltr"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full h-12 ps-9 pe-3 rounded-xl bg-stone-900 border border-stone-700 text-white placeholder-stone-500 focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none font-mono text-sm tracking-widest uppercase"
                />
              </div>
              <p className="text-[11px] text-stone-400 mt-1.5">
                {lang === 'ar'
                  ? 'يمكنك لصق الكود مباشرة، وسيتم تنسيقه تلقائياً.'
                  : lang === 'fr'
                  ? 'Vous pouvez coller le code directement.'
                  : 'You can paste the code directly; spaces and letter case are normalized automatically.'}
              </p>
            </div>
          )}

          {/* EMAIL: Shown in signin, signup, staff_signup, forgot_password */}
          {mode !== 'set_new_password' && mode !== 'join_restaurant' && (
            <div>
              <label className="font-bold text-stone-300 uppercase text-[10px] block mb-1">
                {lang === 'ar'
                  ? 'البريد الإلكتروني'
                  : lang === 'fr'
                  ? 'Adresse Email'
                  : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-stone-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@restaurant.com"
                  dir="ltr"
                  className="w-full h-11 ps-9 pe-3 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* PASSWORD: Shown in signin, signup, staff_signup, set_new_password */}
          {mode !== 'forgot_password' && mode !== 'join_restaurant' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-stone-300 uppercase text-[10px]">
                  {mode === 'set_new_password'
                    ? lang === 'ar'
                      ? 'كلمة المرور الجديدة'
                      : lang === 'fr'
                      ? 'Nouveau Mot de passe'
                      : 'New Password'
                    : lang === 'ar'
                    ? 'كلمة المرور'
                    : lang === 'fr'
                    ? 'Mot de passe'
                    : 'Password'}
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot_password')}
                    className="text-[11px] text-[#FF5A1F] hover:underline cursor-pointer"
                  >
                    {lang === 'ar'
                      ? 'نسيت كلمة المرور؟'
                      : lang === 'fr'
                      ? 'Mot de passe oublié ?'
                      : 'Forgot password?'}
                  </button>
                )}
              </div>
              <div className="relative">
                <Key className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-stone-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={mode === 'signin' ? 6 : 8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full h-11 ps-9 pe-10 rounded-xl bg-stone-900 border border-stone-800 text-stone-100 placeholder-stone-500 focus:ring-2 focus:ring-[#FF5A1F] focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-3 my-auto text-stone-300 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {showConfirmPasswordField && password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-stone-300">
                      {lang === 'ar'
                        ? 'قوة كلمة المرور:'
                        : lang === 'fr'
                        ? 'Force du mot de passe :'
                        : 'Password strength:'}
                    </span>
                    <span className="font-bold text-stone-200">{passwordStrength.label}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-stone-800 overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all duration-300`}
                      style={{ width: `${passwordStrength.percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONFIRM PASSWORD */}
          {showConfirmPasswordField && (
            <div>
              <label className="font-bold text-stone-300 uppercase text-[10px] block mb-1">
                {lang === 'ar'
                  ? 'تأكيد كلمة المرور'
                  : lang === 'fr'
                  ? 'Confirmer le mot de passe'
                  : 'Confirm Password'}
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute inset-y-0 start-3 my-auto text-stone-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className={`w-full h-11 ps-9 pe-10 rounded-xl bg-stone-900 border ${
                    passwordsMismatched
                      ? 'border-red-500/80 focus:ring-red-500'
                      : passwordsMatch
                      ? 'border-emerald-500/80 focus:ring-emerald-500'
                      : 'border-stone-800 focus:ring-[#FF5A1F]'
                  } text-stone-100 placeholder-stone-500 focus:ring-2 focus:outline-none font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 end-3 my-auto text-stone-300 hover:text-white transition-colors cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {passwordsMismatched && (
                <p className="text-[10px] text-red-400 mt-1 font-semibold">
                  {lang === 'ar'
                    ? 'كلمتا المرور غير متطابقتين.'
                    : lang === 'fr'
                    ? 'Les mots de passe ne correspondent pas.'
                    : 'Passwords do not match.'}
                </p>
              )}
              {passwordsMatch && (
                <p className="text-[10px] text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>
                    {lang === 'ar'
                      ? 'كلمتا المرور متطابقتان.'
                      : lang === 'fr'
                      ? 'Les mots de passe correspondent.'
                      : 'Passwords match.'}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || (mode === 'signin' && cooldownRemaining > 0)}
            className={`w-full h-11 mt-2 rounded-xl bg-[#FF5A1F] hover:bg-orange-600 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all ${
              mode === 'signin' && cooldownRemaining > 0
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
            }`}
          >
            {loading ? (
              <span>
                {lang === 'ar'
                  ? 'جاري المعالجة...'
                  : lang === 'fr'
                  ? 'Traitement en cours...'
                  : 'Processing...'}
              </span>
            ) : mode === 'signin' && cooldownRemaining > 0 ? (
              <span>
                {lang === 'ar'
                  ? `مقفول (${cooldownRemaining} ثانية)`
                  : lang === 'fr'
                  ? `Verrouillé (${cooldownRemaining}s)`
                  : `Locked (${cooldownRemaining}s)`}
              </span>
            ) : mode === 'signin' ? (
              <>
                <span>
                  {lang === 'ar' ? 'تسجيل الدخول' : lang === 'fr' ? 'Se connecter' : t.signIn}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'signup' ? (
              <>
                <span>
                  {lang === 'ar'
                    ? 'إنشاء المطعم وبدء الإدارة'
                    : lang === 'fr'
                    ? 'Créer mon restaurant'
                    : 'Create Restaurant & Launch'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'staff_signup' ? (
              <>
                <span>
                  {lang === 'ar'
                    ? 'متابعة وإدخال كود الدعوة'
                    : lang === 'fr'
                    ? "Continuer vers le code d'invitation"
                    : 'Continue to Invitation Code'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'join_restaurant' ? (
              <>
                <span>
                  {lang === 'ar'
                    ? 'الانضمام إلى المطعم'
                    : lang === 'fr'
                    ? 'Rejoindre le restaurant'
                    : 'Join Restaurant'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'forgot_password' ? (
              <>
                <Send className="w-4 h-4" />
                <span>
                  {lang === 'ar'
                    ? 'إرسال رابط استعادة كلمة المرور'
                    : lang === 'fr'
                    ? 'Envoyer le lien de réinitialisation'
                    : 'Send Recovery Link'}
                </span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {lang === 'ar'
                    ? 'تحديث كلمة المرور والدخول'
                    : lang === 'fr'
                    ? 'Mettre à jour le mot de passe'
                    : 'Update Password & Sign In'}
                </span>
              </>
            )}
          </button>
        </form>

        {/* Alternate action links */}
        <div className="w-full mt-4 flex flex-col items-center gap-2.5 text-xs">
          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => setMode('staff_signup')}
              className="w-full py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 hover:text-white transition-colors text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Ticket className="w-4 h-4 text-[#FF5A1F]" />
              <span>
                {lang === 'ar'
                  ? 'لدي كود دعوة'
                  : lang === 'fr'
                  ? "J'ai un code d'invitation"
                  : 'I have an invitation code'}
              </span>
            </button>
          )}

          {mode === 'staff_signup' && (
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="text-stone-300 hover:text-white transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>
                {lang === 'ar'
                  ? 'لديك حساب مسبق؟ سجل الدخول لإدخال الكود'
                  : lang === 'fr'
                  ? 'Déjà un compte ? Connectez-vous pour entrer votre code'
                  : 'Already have an account? Sign in to enter your code'}
              </span>
            </button>
          )}

          {(mode === 'forgot_password' || mode === 'set_new_password') && (
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setIsPasswordRecoveryMode(false);
              }}
              className="text-stone-300 hover:text-white transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>
                {lang === 'ar'
                  ? 'العودة لتسجيل الدخول'
                  : lang === 'fr'
                  ? 'Retour à la connexion'
                  : 'Back to Sign In'}
              </span>
            </button>
          )}
        </div>

        {/* Bottom Switch back to Menu */}
        <div className="mt-6 pt-4 border-t border-stone-800/80 w-full flex items-center justify-between text-xs text-stone-300">
          <button
            type="button"
            onClick={() => setCurrentView('menu')}
            className="hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Utensils className="w-3.5 h-3.5 text-orange-400" />
            <span>{t.backToCustomerMenu}</span>
          </button>
          <span className="text-stone-400 font-mono text-[11px]">MenuQR Auth</span>
        </div>
      </div>
    </div>
  );
};
