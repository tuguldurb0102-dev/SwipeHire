import React, { useState, useRef, useEffect, useCallback, createContext, useContext } from "react";
import { computeMatchScore } from "./src/lib/matching.js";
import { checkUpload } from "./src/lib/uploads.js";
import { computePassportScore } from "./src/lib/passport.js";
import PaymentFlow from "./src/components/billing/PaymentFlow.jsx";
import EmployerPlanSheet from "./src/components/billing/EmployerPlanSheet.jsx";
import SeekerPaymentsPanel from "./src/components/billing/SeekerPaymentsPanel.jsx";
import EmployerBillingOverview from "./src/components/billing/EmployerBillingOverview.jsx";
import EmployerUsagePanel from "./src/components/billing/EmployerUsagePanel.jsx";
import EmployerInvoicePanel from "./src/components/billing/EmployerInvoicePanel.jsx";
import RecruitmentAnalyticsPanel from "./src/components/billing/RecruitmentAnalyticsPanel.jsx";
import { isConfigured as SUPABASE_CONFIGURED } from "./src/services/supabase/client.js";
import { getSession, onAuthStateChange, signOut as authSignOut } from "./src/services/auth.service.js";
import { getCurrentProfile, updateCandidateProfile, getCandidateProfile, updateEmployerProfile, getEmployerProfile, listPublishedCandidates } from "./src/services/profile.service.js";
import { getOrCreateCompany } from "./src/services/company.service.js";
import { listActiveJobs, createJob } from "./src/services/job.service.js";
import { applyToJob, saveCandidate, listSavedCandidates, unsaveCandidate } from "./src/services/application.service.js";
import { createConversation } from "./src/services/message.service.js";
import { uploadFile, getPublicUrl, getCandidateDocumentUrl } from "./src/services/storage.service.js";
import AuthGate from "./src/components/auth/AuthGate.jsx";
import PostJobSheet from "./src/components/employer/PostJobSheet.jsx";
import ChatPanel from "./src/components/chat/ChatPanel.jsx";
import ApplicantsPanel from "./src/components/employer/ApplicantsPanel.jsx";
import NotificationBell from "./src/components/notifications/NotificationBell.jsx";
import MyJobsPanel from "./src/components/employer/MyJobsPanel.jsx";
import VerificationRequestSheet from "./src/components/verification/VerificationRequestSheet.jsx";

import {

  Bookmark,

  BookmarkCheck,

  Phone,

  FileDown,

  Flag,

  MapPin,

  Briefcase,

  Wallet,

  Play,

  Volume2,

  VolumeX,

  Search,

  ChevronUp,

  X,

  Check,

  Layers,

  Trash2,

  Inbox,

  ChevronLeft,

  Sparkles,

  FileText,

  GraduationCap,

  Award,

  BadgeCheck,

  ShieldCheck,

  Contact,

  CheckCircle2,

  Clock,

  StickyNote,

  LayoutDashboard,

  CircleDot,

  CalendarClock,

  User,

  Building2,

  Video,

  Upload,

  ArrowRight,

  HardHat,

  Send,

  Mail,

  Plus,

  ChevronRight,

  ChevronDown,

  Zap,

  Crown,

  Bell,

  Users,

  MessageCircle,

} from "lucide-react";



/* ── i18n ─────────────────────────────────────────────── */

const LangCtx = createContext({ lang: "mn", t: k => k });

const useLang = () => useContext(LangCtx);



const STRINGS = {

  mn: {

    // Role select

    welcome: "Тавтай морил",

    tagline: "Монголын анхны видео CV платформ.\nТа хэн бэ?",

    roleSeeker: "Ажил хайгч",

    roleSeekerSub: "Видео CV үүсгэж, ажил олгогчдод өөрийгөө танилцуул",

    roleEmployer: "Ажил олгогч",

    roleEmployerSub: "Нэр дэвшигчдийг үзэж, 30 секундэд зөв хүнээ ол",

    trustLine: "Итгэлцэл бол бидний үндсэн үнэ цэнэ",

    // Topbar

    switchToEmployer: "Ажил олгогч →",

    switchToSeeker: "Ажил хайгч →",

    // Tabs — employer

    tabFeed: "Видео CV",

    tabSaved: "Хадгалсан",

    tabDash: "Самбар",

    tabFinance: "Санхүү",

    // Tabs — seeker

    tabProfile: "Профайл",

    tabJobs: "Ажлын зар",

    tabMessages: "Мессеж",

    tabOffers: "Санал",

    offerTitle: "Ажлын санал",

    offerSub: "Ажил олгогчдын илгээсэн саналууд",

    offerAccept: "Зөвшөөрөх",

    offerDecline: "Татгалзах",

    offerAccepted: "✓ Зөвшөөрсөн",

    offerDeclined: "Татгалзсан",

    offerNew: "Шинэ",

    offerFreeLeft: "үнэгүй зөвшөөрөл үлдсэн",

    offerLimitTitle: "Лимит дүүрлээ",

    offerLimitSub: "3 саналыг үнэгүй зөвшөөрч болно. Хязгааргүй болгохын тулд Pro авна уу.",

    // Wizard

    next: "Үргэлжлүүлэх",

    back: "Буцах",

    publish: "Профайл нийтлэх",

    editProfile: "Профайл засах",

    published: "Таны профайл нийтлэгдлээ! Ажил олгогчид одоо таныг харж байна.",

    // Wizard steps

    step1: "Хувийн мэдээлэл",

    step2: "Өөрийн тухай",

    step3: "Туршлага",

    step4: "Боловсрол",

    step5: "Ур чадвар",

    step6: "Видео CV",

    step7: "Сертификат",

    step8: "Цалин & Боломж",

    step9: "Ур чадварын тест",

    // Feed

    allCategories: "Бүгд",

    noResults: "ангиллын нэр дэвшигч одоогоор алга.",

    showAll: "Бүгдийг үзэх",

    viewProfile: "Дэлгэрэнгүй профайл харах →",

    saveBtn: "Хадгалах",

    savedBtn: "Хадгалсан",

    contactBtn: "Холбогдох",

    downloadCV: "CV татах",

    profileBtn: "Профайл",

    available: "Ажиллах боломжтой",

    // Shortlist

    shortlistTitle: "Хадгалсан нэр дэвшигчид",

    emptyShortlist: "Хадгалсан нэр дэвшигч алга.",

    browseBtn: "Нэр дэвшигч үзэх",

    // Dashboard

    dashTitle: "Хянах самбар",

    emptyDash: "Хяналтад нэр дэвшигч алга байна.",

    // Stage keys (for STAGE_MAP lookup)

    new: "Шинэ", saved: "Хадгалсан", contacted: "Холбогдсон",

    interview: "Ярилцлага товлосон", offer: "Санал хүргүүлсэн",

    hired: "Ажилд авсан", rejected: "Татгалзсан",

    stageNew: "Шинэ",

    stageSaved: "Хадгалсан",

    stageContacted: "Холбогдсон",

    stageInterview: "Ярилцлага товлосон",

    stageOffer: "Санал хүргүүлсэн",

    stageHired: "Ажилд авсан",

    stageRejected: "Татгалзсан",

    // Finance

    financeTitle: "Санхүү",

    currentPlan: "Одоогийн план",

    freePlan: "Үнэгүй план",

    proPlan: "Pro план идэвхтэй",

    freeSwipesLeft: "swipe үлдсэн",

    nextBilling: "Дараагийн төлбөр:",

    goPro: "Pro болох",

    active: "ИДЭВХТЭЙ",

    pricingTitle: "ҮНИЙН САНАЛ",

    spendReport: "ЗАРДЛЫН ДҮНГИЙН ТАЙЛАН",

    totalSpend: "НИЙТ ЗАРЦУУЛАЛТ",

    hiredCount: "АЖИЛД АВСАН",

    costPerHire: "НЭГЖ ЗАРДАЛ",

    avgSalary: "ДУНДАЖ ЦАЛИН",

    monthlySpend: "САРЫН ЗАРЦУУЛАЛТ",

    invoices: "НЭХЭМЖЛЭХҮҮД",

    paid: "✓ Төлсөн",

    pending: "Хүлээгдэж байна",

    applications: "ӨРГӨДӨЛ ГАРГАСАН",

    profileViews: "ПРОФАЙЛ ҮЗСЭН",

    thisQuarter: "энэ улирал",

    avgHireSalary: "авсан ажилтнуудын",

    hireAvg: "ажилд авах дундаж",

    // Paywall

    paywallTitleEmp: "Ажил олгогчийн Pro",

    paywallTitleSeeker: "SwipeHire Pro",

    paywallSub: "үнэгүй swipe дууссан — Pro-д шилжиж хязгааргүй болгоорой",

    subscribeBtn: "захиалга —",

    laterBtn: "Дараа нь захиална",

    // Paywall features employer

    featUnlimitedSwipe: "Хязгааргүй нэр дэвшигч харах",

    featContact: "Холбоо барих мэдээлэл нэн даруй",

    featVideoInvite: "Видео interview урилга",

    featAI: "AI профайл шинжилгээ",

    // Paywall features seeker

    featUnlimitedJobs: "Хязгааргүй ажлын зар харах",

    featApply: "Шууд өргөдөл гаргах",

    featEarlyView: "Ажил олгогч таныг эрт хардаг",

    featBoost: "Профайл дээшлүүлэх (Boost)",

    // Plans

    plan1m: "1 сар",

    plan6m: "6 сар",

    plan1y: "1 жил",

    // Categories (mn keys = same)

    "Шууд": "Шууд", "1 сарын дараа": "1 сарын дараа", "Хэлэлцэх боломжтой": "Хэлэлцэх боломжтой",

    catAll: "Бүгд",

    "Бүгд": "Бүгд", "Гагнуурчин": "Гагнуурчин", "Мужаан": "Мужаан",

    "Цахилгаанчин": "Цахилгаанчин", "Барилгачин": "Барилгачин", "Сантехникч": "Сантехникч",

    "Засварчин": "Засварчин", "Жолооч": "Жолооч", "Тогооч": "Тогооч",

    "Зөөгч": "Зөөгч", "Цэвэрлэгч": "Цэвэрлэгч", "Хамгаалагч": "Хамгаалагч",

    "Оператор": "Оператор", "Боолтчин": "Боолтчин", "Будагчин": "Будагчин",

    "Гагнуур слесарь": "Гагнуур слесарь", "Агуулахын ажилтан": "Агуулахын ажилтан",

    "Худалдагч": "Худалдагч",

    // Verification

    verifyTitle: "Итгэлцлийн баталгаажуулалт",

    verifyPhone: "Утас баталгаажуулах",

    verifyId: "Иргэний үнэмлэх",

    verifySkill: "Ур чадвар тест",

    verified: "Баталгаажсан",

    // Job feed (seeker)

    jobFeedTitle: "Ажлын зар",

    jobFeedSub: "Баруун → Хүсэлт илгээх · Зүүн → Үлдээх",

    applyBtn: "Passport-оор хүсэлт илгээх",

    passBtn: "Үлдээх",

    applied: "өргөдөл",

    allDone: "Бүх зар харлаа!",

    allDoneSub: "ажилд өргөдөл гаргалаа. Ажил олгогч тантай холбогдоно.",

    watchAgain: "Дахин харах",

    limitDone: "Лимит дууссан",

    freeLeft: "үнэгүй",

    urgent: "ЯАРАЛТАЙ",

    requiredSkills: "ШААРДАХ ЧАДВАР",

    // Profile detail

    profileDetail: "Дэлгэрэнгүй профайл",

    aiSummary: "AI ДҮГНЭЛТ",

    certTitle: "Гэрчилгээ & Зөвшөөрөл",

    expTitle: "Туршлага",

    eduTitle: "Боловсрол",

    videoIntro: "Танилцуулга видео",

    inviteVideo: "Видео ярилцлагад урих",

    // Contact sheet

    contactTitle: "Холбоо барихуулах",

    sendOTP: "OTP код илгээх",

    // Video invite

    videoInviteTitle: "Видео ярилцлагад урих",

    scheduleInterview: "Ярилцлага товлох",

  },

  en: {

    // Role select

    welcome: "Welcome",

    tagline: "Mongolia's first video CV platform.\nWho are you?",

    roleSeeker: "Job Seeker",

    roleSeekerSub: "Create a video CV and introduce yourself to employers",

    roleEmployer: "Employer",

    roleEmployerSub: "Browse candidates and find the right person in 30 seconds",

    trustLine: "Trust is our core value",

    // Topbar

    switchToEmployer: "Employer →",

    switchToSeeker: "Job Seeker →",

    // Tabs — employer

    tabFeed: "Feed",

    tabSaved: "Saved",

    tabDash: "Pipeline",

    tabFinance: "Finance",

    // Tabs — seeker

    tabProfile: "Profile",

    tabJobs: "Jobs",

    tabMessages: "Messages",

    tabOffers: "Offers",

    offerTitle: "Job Offers",

    offerSub: "Offers sent by employers",

    offerAccept: "Accept",

    offerDecline: "Decline",

    offerAccepted: "✓ Accepted",

    offerDeclined: "Declined",

    offerNew: "New",

    offerFreeLeft: "free accepts left",

    offerLimitTitle: "Limit reached",

    offerLimitSub: "You can accept 3 offers for free. Go Pro for unlimited.",

    // Wizard

    next: "Continue",

    back: "Back",

    publish: "Publish Profile",

    editProfile: "Edit Profile",

    published: "Your profile is live! Employers can now find you.",

    // Wizard steps

    step1: "Personal Info",

    step2: "About Me",

    step3: "Experience",

    step4: "Education",

    step5: "Skills",

    step6: "Video CV",

    step7: "Certificates",

    step8: "Salary & Availability",

    step9: "Skill Test",

    // Feed

    allCategories: "All",

    noResults: "category has no candidates yet.",

    showAll: "Show all",

    viewProfile: "View full profile →",

    saveBtn: "Save",

    savedBtn: "Saved",

    contactBtn: "Contact",

    downloadCV: "Download CV",

    profileBtn: "Profile",

    available: "Available",

    // Shortlist

    shortlistTitle: "Saved Candidates",

    emptyShortlist: "No saved candidates yet.",

    browseBtn: "Browse Candidates",

    // Dashboard

    dashTitle: "Pipeline",

    emptyDash: "No candidates in the pipeline.",

    // Stage keys

    new: "New", saved: "Saved", contacted: "Contacted",

    interview: "Interview Scheduled", offer: "Offer Sent",

    hired: "Hired", rejected: "Rejected",

    stageNew: "New",

    stageSaved: "Saved",

    stageContacted: "Contacted",

    stageInterview: "Interview Scheduled",

    stageOffer: "Offer Sent",

    stageHired: "Hired",

    stageRejected: "Rejected",

    // Finance

    financeTitle: "Finance",

    currentPlan: "Current Plan",

    freePlan: "Free Plan",

    proPlan: "Pro Plan Active",

    freeSwipesLeft: "swipes remaining",

    nextBilling: "Next billing:",

    goPro: "Go Pro",

    active: "ACTIVE",

    pricingTitle: "PRICING",

    spendReport: "SPENDING SUMMARY",

    totalSpend: "TOTAL SPEND",

    hiredCount: "HIRED",

    costPerHire: "COST PER HIRE",

    avgSalary: "AVG SALARY",

    monthlySpend: "MONTHLY SPEND",

    invoices: "INVOICES",

    paid: "✓ Paid",

    pending: "Pending",

    applications: "APPLICATIONS",

    profileViews: "PROFILE VIEWS",

    thisQuarter: "this quarter",

    avgHireSalary: "of hired staff",

    hireAvg: "avg. cost to hire",

    // Paywall

    paywallTitleEmp: "Employer Pro",

    paywallTitleSeeker: "SwipeHire Pro",

    paywallSub: "free swipes used — upgrade to Pro for unlimited access",

    subscribeBtn: "Subscribe —",

    laterBtn: "Maybe later",

    // Paywall features employer

    featUnlimitedSwipe: "Unlimited candidate views",

    featContact: "Instant contact details",

    featVideoInvite: "Video interview invitations",

    featAI: "AI profile analysis",

    // Paywall features seeker

    featUnlimitedJobs: "Unlimited job listings",

    featApply: "Instant applications",

    featEarlyView: "Employers see you first",

    featBoost: "Profile boost",

    // Plans

    plan1m: "1 Month",

    plan6m: "6 Months",

    plan1y: "1 Year",

    // Categories

    catAll: "All",

    "Шууд": "Immediately", "1 сарын дараа": "In 1 month", "Хэлэлцэх боломжтой": "Negotiable",

    "Бүгд": "All", "Гагнуурчин": "Welder", "Мужаан": "Carpenter",

    "Цахилгаанчин": "Electrician", "Барилгачин": "Construction", "Сантехникч": "Plumber",

    "Засварчин": "Technician", "Жолооч": "Driver", "Тогооч": "Cook",

    "Зөөгч": "Waiter", "Цэвэрлэгч": "Cleaner", "Хамгаалагч": "Security",

    "Оператор": "Operator", "Боолтчин": "Packer", "Будагчин": "Painter",

    "Гагнуур слесарь": "Welder/Fitter", "Агуулахын ажилтан": "Warehouse", "Худалдагч": "Sales",

    "Захиргааны туслах": "Admin Assistant", "Нягтлан бодогч": "Accountant",

    "Маркетингийн мэргэжилтэн": "Marketer", "Програмист": "Developer",

    // Verification

    verifyTitle: "Trust Verification",

    verifyPhone: "Phone Verification",

    verifyId: "National ID",

    verifySkill: "Skill Test",

    verified: "Verified",

    // Job feed (seeker)

    jobFeedTitle: "Job Listings",

    jobFeedSub: "Right → Apply with Passport · Left → Skip",

    applyBtn: "Apply with Passport",

    passBtn: "Skip",

    applied: "applied",

    allDone: "All listings viewed!",

    allDoneSub: "applications submitted. Employers will reach out.",

    watchAgain: "Start over",

    limitDone: "Limit reached",

    freeLeft: "free",

    urgent: "URGENT",

    requiredSkills: "REQUIRED SKILLS",

    // Profile detail

    profileDetail: "Full Profile",

    aiSummary: "AI SUMMARY",

    certTitle: "Certificates & Licenses",

    expTitle: "Experience",

    eduTitle: "Education",

    videoIntro: "Intro Video",

    inviteVideo: "Invite to Video Interview",

    // Contact sheet

    contactTitle: "Contact Candidate",

    sendOTP: "Send OTP Code",

    // Video invite

    videoInviteTitle: "Invite to Video Interview",

    scheduleInterview: "Schedule Interview",

  },

  ko: {

    welcome: "환영합니다", welcomeSub: "몽골 최초의 비디오 CV 플랫폼.",

    whoAreYou: "어떤 분이신가요?", seeker: "구직자", employer: "고용주",

    tagline: "비디오 CV로 꿈의 직장을\n지금 바로 찾아보세요.",

    roleSeeker: "구직자", roleSeekerSub: "비디오 CV를 만들어 고용주에게 소개하세요",

    roleEmployer: "고용주", roleEmployerSub: "지원자를 보고 30초 만에 적합한 인재를 찾으세요",

    trustLine: "신뢰 인증은 저희의 핵심 가치입니다",

    tabFeed: "피드", tabSaved: "저장됨", tabPipeline: "파이프라인", tabFinance: "재무",

    tabProfile: "프로필", tabJobs: "채용공고", tabMessages: "메시지", tabOffers: "제안",

    paywallTitleEmp: "고용주 Pro", paywallTitleSeeker: "SwipeHire Pro",

    paywallSub: "무료 스와이프 소진 — Pro로 업그레이드하세요",

    subscribeBtn: "구독 —", laterBtn: "나중에",

    saveBtn: "저장", savedBtn: "저장됨", contactBtn: "연락하기",

    downloadCV: "CV 다운로드", profileBtn: "프로필", viewProfile: "전체 프로필 보기 →",

    available: "즉시 가능", editProfile: "프로필 수정",

    publish: "프로필 게시", next: "다음",

    new: "신규", saved: "저장됨", contacted: "연락됨",

    interview: "면접 예정", offer: "제안 발송됨", hired: "채용됨", rejected: "거절됨",

    stageSaved: "저장됨", stageContacted: "연락됨", stageInterview: "면접",

    stageOffer: "제안", stageHired: "채용됨", stageRejected: "거절됨",

    "Шууд": "즉시", "Бүгд": "전체", "Гагнуурчин": "용접공",

    "Мужаан": "목수", "Цахилгаанчин": "전기공", "Барилгачин": "건설",

    "Сантехникч": "배관공", "Засварчин": "기술자", "Жолооч": "운전기사",

    "Тогооч": "요리사", "Зөөгч": "웨이터", "Цэвэрлэгч": "청소부",

    "Хамгаалагч": "보안요원", "Оператор": "운영자", "Боолтчин": "포장원",

    "Будагчин": "도장공", "Гагнуур слесарь": "용접 조립공", "Агуулахын ажилтан": "창고",

    "Худалдагч": "영업", "Захиргааны туслах": "행정보조", "Нягтлан бодогч": "회계사",

    "Маркетингийн мэргэжилтэн": "마케터", "Програмист": "개발자",

    proPlan: "SwipeHire Pro", freePlan: "무료 플랜", goPro: "Pro 전환",

    active: "활성", nextBilling: "다음 결제:", freeSwipesLeft: "무료 스와이프 남음",

    totalSpend: "총 지출", hiredCount: "채용됨",

    invoices: "청구서", paid: "✓ 납부됨", pending: "대기 중",

    verified: "인증됨", verifyTitle: "신뢰 인증",

    verifyPhone: "전화 인증", verifyId: "신분증", verifySkill: "기술 테스트",

    step1: "개인정보", step2: "자기소개", step3: "경력",

    step4: "학력", step5: "기술", step6: "비디오 CV",

    step7: "자격증 & CV", step8: "급여 & 가용성", step9: "기술 테스트",

    jobFeedTitle: "채용공고", jobFeedSub: "오른쪽 → Passport로 지원 · 왼쪽 → 패스", applyBtn: "Passport로 지원",

    allDone: "모든 공고를 확인했습니다!", allDoneSub: "지원 완료. 고용주가 연락할 것입니다.",

    watchAgain: "다시 시작", limitDone: "한도 초과", freeLeft: "무료",

    noResults: "이 카테고리에 지원자가 없습니다.", showAll: "전체 보기",

    dashTitle: "파이프라인", emptyDash: "파이프라인에 지원자가 없습니다.",

    shortlistTitle: "저장된 지원자", emptyShortlist: "저장된 지원자가 없습니다.",

    browseBtn: "지원자 검색", aiSummary: "AI 요약",

    certTitle: "자격증 & 면허", expTitle: "경력", eduTitle: "학력",

    videoIntro: "소개 영상", profileDetail: "전체 프로필",

    spendReport: "지출 보고서", monthlySpend: "월별 지출",

    pricingTitle: "요금제", applications: "지원서",

    profileViews: "프로필 조회", thisQuarter: "이번 분기",

    costPerHire: "채용 단가", avgSalary: "평균 급여",

    featUnlimitedSwipe: "무제한 지원자 조회",

    featContact: "즉시 연락처 확인", featVideoInvite: "화상 면접 초대",

    featAI: "AI 프로필 분석", featUnlimitedJobs: "무제한 채용공고 조회",

    featApply: "직접 지원", featEarlyView: "고용주가 먼저 봅니다",

    featBoost: "프로필 부스트",

    plan1m: "1개월", plan6m: "6개월", plan1y: "1년",

    catAll: "전체",

    urgent: "긴급", requiredSkills: "필수 기술",

    profileDetail: "전체 프로필", aiSummary: "AI 요약",

    certTitle: "자격증 & 면허", expTitle: "경력", eduTitle: "학력",

    videoIntro: "소개 영상", inviteVideo: "화상 면접 초대",

    contactTitle: "지원자 연락하기", sendOTP: "OTP 코드 전송",

    videoInviteTitle: "화상 면접 초대", scheduleInterview: "면접 일정 잡기",

    offerTitle: "채용 제안", offerSub: "고용주가 보낸 제안",

    offerAccept: "수락", offerDecline: "거절",

    offerAccepted: "✓ 수락됨", offerDeclined: "거절됨",

    offerNew: "신규", offerFreeLeft: "무료 수락 가능",

    offerLimitTitle: "한도 초과", offerLimitSub: "3개 제안을 무료로 수락할 수 있습니다. 무제한은 Pro로 업그레이드하세요.",

  },

};



/* ─────────────────────────────────────────────

   SwipeHire — Монголын анхны видео CV платформ

   30 секундэд зөв хүнээ ол

   ───────────────────────────────────────────── */



const CATEGORIES = [

  "Бүгд",

  "Гагнуурчин",

  "Мужаан",

  "Цахилгаанчин",

  "Барилгачин",

  "Сантехникч",

  "Засварчин",

  "Жолооч",

  "Тогооч",

  "Зөөгч",

  "Цэвэрлэгч",

  "Хамгаалагч",

  "Оператор",

  "Боолтчин",

  "Будагчин",

  "Гагнуур слесарь",

  "Агуулахын ажилтан",

  "Худалдагч",

];



// Мэргэжил-кодлосон өнгөнүүд — барилгын талбайн дохионы хэл

const TRADE = {

  Гагнуурчин: { hex: "#FF6B35", label: "Гагнуурчин" },

  Мужаан: { hex: "#C68B59", label: "Мужаан" },

  Цахилгаанчин: { hex: "#FFD23F", label: "Цахилгаанчин" },

  Барилгачин: { hex: "#F4A300", label: "Барилгачин" },

  Сантехникч: { hex: "#4FA3FF", label: "Сантехникч" },

  Засварчин: { hex: "#9B8CFF", label: "Засварчин" },

  Жолооч: { hex: "#5BC0EB", label: "Жолооч" },

  Тогооч: { hex: "#FF8FA3", label: "Тогооч" },

  Зөөгч: { hex: "#3DDC97", label: "Зөөгч" },

  Цэвэрлэгч: { hex: "#62D2A2", label: "Цэвэрлэгч" },

  Хамгаалагч: { hex: "#A0A0A0", label: "Хамгаалагч" },

  Оператор: { hex: "#E07A5F", label: "Оператор" },

  Боолтчин: { hex: "#D4A373", label: "Боолтчин" },

  Будагчин: { hex: "#F4845F", label: "Будагчин" },

  "Гагнуур слесарь": { hex: "#FF6B6B", label: "Слесарь" },

  "Агуулахын ажилтан": { hex: "#88B04B", label: "Агуулах" },

  Худалдагч: { hex: "#FFB627", label: "Худалдагч" },

};



// Ажилд авах үе шатын төлөвүүд

const STAGES = [

  { key: "new", label: "Шинэ", hex: "#8a8a8a" },

  { key: "saved", label: "Хадгалсан", hex: "#FF6B35" },

  { key: "contacted", label: "Холбогдсон", hex: "#4FA3FF" },

  { key: "interview", label: "Ярилцлага товлосон", hex: "#B488FF" },

  { key: "offer", label: "Санал хүргүүлсэн", hex: "#FFD23F" },

  { key: "hired", label: "Ажилд авсан", hex: "#3DDC97" },

  { key: "rejected", label: "Татгалзсан", hex: "#FF6B6B" },

];

const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.key, s]));



const tgr = (n) => "₮" + n.toLocaleString("en-US");



const CANDIDATES = [

  {

    id: 1,

    name: "Батболд Дорж",

    age: 34,

    location: "Улаанбаатар",

    category: "Гагнуурчин",

    years: 12,

    salary: 2800000,

    available: true,

    availableFrom: "Шууд",

    photo: "https://i.pravatar.cc/300?img=12",

    poster: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=70",

    video: "./demo-video-cv.mp4",

    videoFile: "./demo-video-cv.mp4",

    pitch: "Сайн байна уу! Би Батболд. MIG, TIG болон бүтцийн гагнуурт 12 жил ажилласан. AWS D1.1 гэрчилгээтэй.",

    about:

      "Барилга, үйлдвэрийн салбарт 12 жил ажилласан туршлагатай гагнуурчин. Хүнд даацын бүтэц, дам нуруу, хоолойн гагнуурт мэргэшсэн. Аюулгүй ажиллагааг чанд баримталдаг.",

    skills: ["MIG гагнуур", "TIG гагнуур", "Бүтцийн гагнуур", "Хоолойн гагнуур", "Зураг унших"],

    certs: ["AWS D1.1 гэрчилгээ", "Аюулгүй ажиллагааны сертификат", "Өндөрлөгийн ажлын зөвшөөрөл"],

    experience: [

      { role: "Ахлах гагнуурчин", org: "МонголБарилга ХХК", period: "2019–2024" },

      { role: "Гагнуурчин", org: "Эрдэнэт Үйлдвэр", period: "2014–2019" },

    ],

    education: [{ degree: "Гагнуурын техникч", school: "ПТК-12, Улаанбаатар", period: "2010–2012" }],

    phone: "+97699112233",

    email: "batbold.dorj@gmail.com",

    verified: { phone: true, id: true, skill: true },

    transcript:

      "Сайн байна уу, намайг Батболд гэдэг. Би 12 жил гагнуурчнаар ажиллаж байна. MIG, TIG болон бүтцийн гагнуурт мэргэшсэн, AWS D1.1 гэрчилгээтэй. Цэвэр, нямбай ажиллах нь миний зарчим.",

    ai: {

      coreSkill: "Бүтцийн гагнуур (MIG/TIG)",

      level: "Ахисан түвшин",

      strengths: ["Олон жилийн туршлага", "Олон улсын гэрчилгээтэй", "Аюулгүй ажиллагаа сайн"],

      bestFit: "Барилга, хүнд үйлдвэрийн гагнуурчин",

      resume: "Батболд бол 12 жилийн туршлагатай гагнуурчин. Барилга, хүнд үйлдвэрийн томоохон төслүүдэд ажилласан. AWS D1.1 олон улсын гэрчилгээтэй, ахлах түвшний туршлагатай. Аюулгүй ажиллагаа, нямбай чанарыг эрхэмлэдэг.",

    },

  },

  {

    id: 2,

    name: "Энхтүвшин Бат",

    age: 29,

    location: "Дархан",

    category: "Цахилгаанчин",

    years: 7,

    salary: 2500000,

    available: true,

    availableFrom: "2 долоо хоногийн дотор",

    photo: "https://i.pravatar.cc/300?img=45",

    poster: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=70",

    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",

    pitch: "Орон сууц, олон нийтийн барилгын цахилгаан. Самбар угсралт, эвдрэл засвар.",

    about:

      "Орон сууц болон арилжааны барилгын цахилгааны системд 7 жил ажилласан. Самбар угсралт, EV цэнэглэгч суурилуулалт, эвдрэл оношилгоонд гаршсан.",

    skills: ["Самбар угсралт", "Утас татлага", "Эвдрэл оношилгоо", "EV цэнэглэгч", "Гэрэлтүүлэг"],

    certs: ["Цахилгааны аюулгүй ажиллагааны гэрчилгээ", "III зэргийн цахилгаанчин"],

    experience: [

      { role: "Цахилгаанчин", org: "Дархан Хот СӨХ", period: "2020–2024" },

      { role: "Туслах цахилгаанчин", org: "Селенге Констракшн", period: "2017–2020" },

    ],

    education: [{ degree: "Цахилгааны инженер техникч", school: "ШУТИС Дархан салбар", period: "2013–2017" }],

    phone: "+97699334455",

    email: "enkhtuvshiin.bat@yahoo.com",

    verified: { phone: true, id: true, skill: false },

    transcript:

      "Намайг Энхтүвшин гэдэг. 7 жил цахилгаанчнаар ажилласан. Самбар угсралт, утас татлага, эвдрэл засварт туршлагатай. Цаг барьж, найдвартай ажилладаг.",

    ai: {

      coreSkill: "Барилгын цахилгаан угсралт",

      level: "Дунд түвшин",

      strengths: ["EV цэнэглэгчийн туршлага", "Найдвартай", "Орон нутагт ажиллах боломжтой"],

      bestFit: "Орон сууц, арилжааны барилгын цахилгаанчин",

      resume: "Энхтүвшин бол 7 жилийн туршлагатай цахилгаанчин. Орон сууц, арилжааны барилгын цахилгаан системд мэргэшсэн. Самбар угсралт, EV цэнэглэгч суурилуулалт, эвдрэл оношилгоонд гаршсан. Найдвартай, цаг баримталдаг.",

    },

  },

  {

    id: 3,

    name: "Мөнхзул Ган",

    age: 41,

    location: "Эрдэнэт",

    category: "Мужаан",

    years: 18,

    salary: 2400000,

    available: false,

    availableFrom: "2026 оны 8-р сараас",

    photo: "https://i.pravatar.cc/300?img=33",

    poster: "https://images.unsplash.com/photo-1601564921647-b446839a013f?w=800&q=70",

    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",

    pitch: "Хийцээс гоёл чимэглэл хүртэл. Тавилга, хаалга, захиалгат бүтээгдэхүүн.",

    about:

      "18 жилийн туршлагатай мужаан. Барилгын мод хийцээс эхлээд нарийн гоёл чимэглэл, захиалгат тавилга хийдэг. Хэмжээ нягт, чанар өндөр.",

    skills: ["Тавилга хийц", "Хаалга цонх", "Гоёл чимэглэл", "Захиалгат бүтээл", "Модон шал"],

    certs: ["Модон эдлэлийн мастер", "Гар урлалын гэрчилгээ"],

    experience: [

      { role: "Ахлах мужаан", org: "Орхон Тавилга", period: "2015–2024" },

      { role: "Мужаан", org: "Эрдэнэт Барилга", period: "2006–2015" },

    ],

    education: [{ degree: "Модон эдлэлийн урлаач", school: "МУИС-ийн МСҮТ", period: "2002–2005" }],

    phone: "+97699556677",

    email: "munkhzul.gan@mail.mn",

    verified: { phone: true, id: true, skill: true },

    transcript:

      "Намайг Мөнхзул гэдэг. 18 жил мужаанаар ажилласан. Тавилга, хаалга, захиалгат бүтээл хийдэг. Хэмжээ нягт, чанартай ажиллах нь миний онцлог.",

    ai: {

      coreSkill: "Захиалгат мод хийц, тавилга",

      level: "Ахисан түвшин",

      strengths: ["18 жилийн туршлага", "Нарийн гар ур чадвар", "Мастер гэрчилгээтэй"],

      bestFit: "Тавилга үйлдвэр, барилгын засал чимэглэл",

      resume: "Мөнхзул бол 18 жилийн туршлагатай мужаан. Барилгын мод хийц, захиалгат тавилга, нарийн гоёл чимэглэлд мэргэшсэн мастер. Хэмжээ нягт, чанар өндөр. Урт хугацааны төслүүдэд тогтвортой ажилласан туршлагатай.",

    },

  },

  {

    id: 4,

    name: "Тэмүүлэн Сүх",

    age: 26,

    location: "Өмнөговь",

    category: "Барилгачин",

    years: 4,

    salary: 1800000,

    available: true,

    availableFrom: "Шууд",

    photo: "https://i.pravatar.cc/300?img=51",

    poster: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=70",

    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",

    pitch: "OSHA 30. Бетон, нураалт, тоног төхөөрөмж. Хүчтэй, найдвартай, ээлж таслахгүй.",

    about:

      "Уул уурхай, барилгын талбайд 4 жил ажилласан. Бетон цутгалт, нураалт, тоног төхөөрөмжийн ажилд туршлагатай. Хүнд нөхцөлд тэсвэртэй.",

    skills: ["Бетон цутгалт", "Нураалт", "Тоног төхөөрөмж", "Ачаа зөөвөр", "Талбайн бэлтгэл"],

    certs: ["OSHA 30 гэрчилгээ", "Уул уурхайн аюулгүй ажиллагаа"],

    experience: [

      { role: "Барилгачин", org: "Оюу Толгой туслан гүйцэтгэгч", period: "2021–2024" },

      { role: "Туслах ажилтан", org: "Говь Констракшн", period: "2020–2021" },

    ],

    education: [{ degree: "Бүрэн дунд", school: "Өмнөговь 1-р сургууль", period: "2014–2020" }],

    phone: "+97699778899",

    email: "temuurlen.sukh@gmail.com",

    verified: { phone: true, id: false, skill: false },

    transcript:

      "Намайг Тэмүүлэн гэдэг. Уул уурхай, барилгын талбайд 4 жил ажилласан. Бетон, нураалт, тоног төхөөрөмжийн ажил хийдэг. Хүнд нөхцөлд тэсвэртэй, ээлж таслахгүй.",

    ai: {

      coreSkill: "Барилга, талбайн ажил",

      level: "Анхан түвшин",

      strengths: ["Хүнд нөхцөлд тэсвэртэй", "OSHA гэрчилгээтэй", "Залуу, эрч хүчтэй"],

      bestFit: "Уул уурхай, том төслийн барилгачин",

      resume: "Тэмүүлэн бол 4 жилийн туршлагатай барилгын ажилтан. Уул уурхай, том төслийн талбайд бетон, нураалт, тоног төхөөрөмжийн ажил хийсэн. OSHA 30 гэрчилгээтэй. Хүнд нөхцөлд тэсвэртэй, ээлж таслахгүй залуу ажилтан.",

    },

  },

  {

    id: 5,

    name: "Номин Эрдэнэ",

    age: 31,

    location: "Дорнод",

    category: "Зөөгч",

    years: 9,

    salary: 1500000,

    available: true,

    availableFrom: "1 сарын дотор",

    photo: "https://i.pravatar.cc/300?img=47",

    poster: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=70",

    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",

    pitch: "Зэрэглэлийн ресторан, ачаалал ихтэй танхим. Үйлчилгээний өндөр соёл, тайван зан.",

    about:

      "Ресторан, зочид буудлын салбарт 9 жил ажилласан. Үйлчилгээний өндөр соёл, дарсны мэдлэг, ачаалал ихтэй үед тайван байх чадвартай.",

    skills: ["Үйлчилгээ", "Дарсны мэдлэг", "Кассын ажил", "Багаар ажиллах", "Англи хэл"],

    certs: ["Үйлчилгээний стандарт гэрчилгээ", "Хүнсний эрүүл ахуй"],

    experience: [

      { role: "Ахлах зөөгч", org: "Шангри-Ла зочид буудал", period: "2018–2024" },

      { role: "Зөөгч", org: "Modern Nomads ресторан", period: "2015–2018" },

    ],

    education: [{ degree: "Зочлох үйлчилгээний менежмент", school: "ХААИС", period: "2011–2015" }],

    phone: "+97688221133",

    email: "nomin.erdene@gmail.com",

    verified: { phone: true, id: true, skill: true },

    transcript:

      "Намайг Номин гэдэг. Ресторан, зочид буудалд 9 жил ажилласан. Үйлчилгээний соёл өндөр, дарсны мэдлэгтэй. Ачаалал ихтэй үед ч тайван, инээмсэглэлтэй ажилладаг.",

    ai: {

      coreSkill: "Зэрэглэлийн ресторан үйлчилгээ",

      level: "Ахисан түвшин",

      strengths: ["Англи хэлтэй", "Дарсны мэдлэгтэй", "Ачаалалд тэсвэртэй"],

      bestFit: "Зочид буудал, зэрэглэлийн ресторан",

      resume: "Номин бол 9 жилийн туршлагатай зөөгч. Зочид буудал, зэрэглэлийн ресторанд ажилласан. Үйлчилгээний өндөр соёл, дарсны мэдлэгтэй, англи хэлтэй. Ачаалал ихтэй үед ч тайван, инээмсэглэлтэй ажилладаг.",

    },

  },

  {

    id: 6,

    name: "Ганзориг Цэрэн",

    age: 38,

    location: "Улаанбаатар",

    category: "Гагнуурчин",

    years: 15,

    salary: 2900000,

    available: true,

    availableFrom: "Шууд",

    photo: "https://i.pravatar.cc/300?img=15",

    poster: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800&q=70",

    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",

    pitch: "Хоолой, даралтат гагнуур, 6G гэрчилгээтэй. Газрын тос, хийн салбарт ажилласан.",

    about:

      "15 жилийн туршлагатай гагнуурчин. Хоолой болон даралтат сав, 6G гэрчилгээтэй. Газрын тос, хийн томоохон төслүүдэд ажилласан.",

    skills: ["6G хоолойн гагнуур", "Даралтат сав", "TIG гагнуур", "Зураг унших", "Чанарын хяналт"],

    certs: ["6G гэрчилгээ", "API стандарт", "Аюулгүй ажиллагааны гэрчилгээ"],

    experience: [

      { role: "Ахлах гагнуурчин", org: "Петрочайна туслан гүйцэтгэгч", period: "2016–2024" },

      { role: "Гагнуурчин", org: "МАК ХХК", period: "2009–2016" },

    ],

    education: [{ degree: "Гагнуурын инженер", school: "ШУТИС", period: "2005–2009" }],

    phone: "+97699001122",

    email: "ganzorigtseren@yahoo.com",

    verified: { phone: true, id: true, skill: true },

    transcript:

      "Намайг Ганзориг гэдэг. 15 жил гагнуурчнаар ажилласан, 6G гэрчилгээтэй. Хоолой, даралтат савны гагнуурт мэргэшсэн. Газрын тос, хийн салбарт ажилласан туршлагатай.",

    ai: {

      coreSkill: "6G хоолой, даралтат гагнуур",

      level: "Эксперт",

      strengths: ["6G олон улсын гэрчилгээ", "Газрын тосны салбарын туршлага", "Чанарын хяналт"],

      bestFit: "Газрын тос, хий, эрчим хүчний төсөл",

      resume: "Ганзориг бол 15 жилийн туршлагатай эксперт гагнуурчин. Газрын тос, хийн томоохон төслүүдэд ажилласан. 6G олон улсын гэрчилгээтэй, хоолой болон даралтат савны гагнуурт мэргэшсэн. Чанарын хяналтад нягт нямбай.",

    },

  },

  {

    id: 7,

    name: "Мөнхзул Ганбаяр",

    age: 24,

    location: "Улаанбаатар – Баянзүрх",

    category: "Захиргааны туслах",

    years: 2,

    salary: 1600000,

    available: true,

    availableFrom: "Шууд",

    photo: "https://i.pravatar.cc/300?img=47",

    poster: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=70",

    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",

    pitch: "Excel, Word, 1С-д чадвартай. Хурдан бичих, захидал харилцааны туршлагатай. Цагийн менежмент сайн.",

    about:

      "Нягтлан бодох бүртгэлийн зэргийн оюутан байхдаа 2 жил захиргааны туслахаар ажилласан. Excel-д маш сайн, 1С бүртгэлийн программд туршлагатай. Имэйл, бичиг баримт боловсруулалт хурдан, нямбай.",

    skills: [

      "Microsoft Excel",

      "Microsoft Word",

      "1С бүртгэл",

      "Имэйл & Outlook",

      "Google Sheets",

      "Хурдан бичих (10 хуруу)",

      "Тайлан бичих",

      "Багаар ажиллах",

    ],

    certs: ["Нягтлан бодогч туслах — МУБИС 2024", "1С: Үйлдвэрийн аж ахуй 8.3 гэрчилгээ"],

    experience: [

      { role: "Захиргааны туслах", org: "МонгэлТрейд ХХК", period: "2023–2024" },

      { role: "Дадлагажигч нягтлан", org: "Номин Нэгдэл ХХК", period: "2022–2023" },

    ],

    education: [

      { degree: "Нягтлан бодох бүртгэл (БС)", school: "МУБИС", period: "2020–2024" },

    ],

    phone: "+97699445566",

    email: "munkhzul.ganbayar@gmail.com",

    verified: { phone: true, id: true, skill: false },

    transcript:

      "Сайн байна уу, намайг Мөнхзул гэдэг. МУБИС-ийг нягтлан бодох бүртгэлийн чиглэлээр дөнгөж төгссөн. Excel, 1С-д маш сайн ажиллана. Захиргааны баримт бичиг боловсруулалт, имэйл харилцааг хурдан, нямбай зохион байгуулна. Шинэ ажлын байранд хурдан дасан зохицох чадвартай.",

    ai: {

      coreSkill: "Захиргааны баримт бичиг & Excel",

      level: "Дунд түвшин",

      strengths: ["Excel & 1С мэдлэг сайн", "Хурдан суралцдаг", "Цагийн менежмент"],

      bestFit: "Жижиг, дунд компанийн захиргааны туслах",

      resume: "Мөнхзул бол дөнгөж их сургуулиа төгссөн залуу мэргэжилтэн. Excel, 1С-д мэргэшсэн, захиргааны ажлын 2 жилийн туршлагатай. Хурдан суралцах чадвар болон нямбай ажлын хэв маяг нь гол давуу тал.",

    },

  },

  {
    id: 8, name: "Баярмаа Лхагва", age: 33, location: "Улаанбаатар – Хан-Уул",
    category: "Тогооч", years: 10, salary: 1900000, available: true, availableFrom: "Шууд",
    phone: "+97699123456", email: "bayarmaa.lkhagva@gmail.com",
    photo: "https://i.pravatar.cc/300?img=25", poster: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=70",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    pitch: "Монгол болон европын хоол. 5 одтой зочид буудалд 4 жил ажилласан.",
    about: "Монгол болон олон улсын хоол хийх 10 жилийн туршлагатай тогооч. Ресторан болон зочид буудалд ажилласан. Цэвэр ажиллагаа, хоолны аюулгүй байдлыг чанд сахидаг.",
    skills: ["Монгол хоол", "Европын хоол", "Суши", "Нарийн боов", "Хоолны аюулгүй байдал"],
    certs: ["Хоолны эрүүл ахуйн гэрчилгээ", "Олон улсын тогооч — 2020"],
    experience: [
      { role: "Дэд тогооч", org: "Kempinski зочид буудал", period: "2020–2024" },
      { role: "Тогооч", org: "Silk Road ресторан", period: "2014–2020" },
    ],
    education: [{ degree: "Хоол хийх урлаг", school: "МУБИС", period: "2010–2014" }],
    verified: { phone: true, id: true, skill: true },
    transcript: "Намайг Баярмаа гэдэг. 10 жил тогоочоор ажилласан. Монгол болон олон улсын хоол хийдэг. Кемпинскид 4 жил ажилласан туршлагатай.",
    ai: { coreSkill: "Олон улсын хоол хийх", level: "Ахисан түвшин", strengths: ["5 одтой туршлага", "Олон улсын гэрчилгээ", "Цэвэр ажиллагаа"], bestFit: "Зочид буудал, зэрэглэлийн ресторан", resume: "Баярмаа бол 10 жилийн туршлагатай тогооч. Монгол болон олон улсын хоол хийх мэдлэгтэй. Кемпинскид дэд тогоочоор ажилласан." },
  },

  {
    id: 9, name: "Ганбаатар Мөнх", age: 45, location: "Дархан",
    category: "Жолооч", years: 22, salary: 2200000, available: true, availableFrom: "Шууд",
    phone: "+97699234567", email: "ganbaatar.munkh@mail.mn",
    photo: "https://i.pravatar.cc/300?img=11", poster: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=70",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    pitch: "B, C, D ангиллын жолооч. Аюулгүй жолоодлого. Ослын бичиглэлгүй 22 жил.",
    about: "22 жил жолоочоор ажилласан. B, C, D ангиллын тээврийн хэрэгслийг мэргэжлийн түвшинд жолоодно. Ослын бичиглэлгүй.",
    skills: ["B ангилал", "C ангилал", "D ангилал", "Урьдчилан сэргийлэх жолоодлого", "Зайн навигац"],
    certs: ["D ангиллын жолооны эрх", "Мэргэжлийн жолоочийн гэрчилгээ"],
    experience: [
      { role: "Хувийн жолооч", org: "Дархан аж үйлдвэрийн бүс", period: "2015–2024" },
      { role: "Автобусны жолооч", org: "Дархан хотын тээвэр", period: "2002–2015" },
    ],
    education: [{ degree: "Тээврийн инженер", school: "ДТИС", period: "1997–2001" }],
    verified: { phone: true, id: true, skill: true },
    transcript: "Намайг Ганбаатар гэдэг. 22 жил жолоочоор ажилласан. B, C, D ангилал. Ослын бичиглэлгүй цэвэр туршлагатай.",
    ai: { coreSkill: "Мэргэжлийн жолоодлого", level: "Эксперт", strengths: ["22 жил ослгүй", "D ангилал", "Туршлагатай"], bestFit: "Хувийн жолооч, корпорат тээвэр", resume: "Ганбаатар бол 22 жилийн туршлагатай мэргэжлийн жолооч. D ангилал, ослын бичиглэлгүй." },
  },

  {
    id: 10, name: "Оюунцэцэг Доржсүрэн", age: 28, location: "Улаанбаатар – Сонгинохайрхан",
    category: "Сантехникч", years: 6, salary: 1950000, available: true, availableFrom: "Шууд",
    phone: "+97699345678", email: "oyuntsetseg.d@gmail.com",
    photo: "https://i.pravatar.cc/300?img=32", poster: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=70",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    pitch: "Ус дамжуулах, бохир ус. Орон сууц, офисын засвар. Хурдан хугацаанд.",
    about: "6 жилийн туршлагатай сантехникч. Орон сууц, арилжааны барилгын ус дамжуулах болон бохир усны системийн суурилуулалт, засварт мэргэшсэн.",
    skills: ["Ус дамжуулах", "Бохир ус", "Дулааны систем", "Хоолой суурилуулалт", "Засвар"],
    certs: ["Сантехникийн мэргэжлийн гэрчилгээ II зэрэг"],
    experience: [
      { role: "Сантехникч", org: "СантехМастер ХХК", period: "2020–2024" },
      { role: "Туслах сантехникч", org: "Орон сууцны засвар", period: "2018–2020" },
    ],
    education: [{ degree: "Дулаан, хийн хангамж", school: "ШУТИС Политехник коллеж", period: "2014–2018" }],
    verified: { phone: true, id: true, skill: false },
    transcript: "Намайг Оюунцэцэг гэдэг. 6 жил сантехникчаар ажилласан. Орон сууц, офисын ус, дулааны системийн засвар, суурилуулалтад туршлагатай.",
    ai: { coreSkill: "Ус болон дулааны систем", level: "Дунд түвшин", strengths: ["Хурдан хугацаанд", "Орон сууц, офис хоёуланд", "Найдвартай"], bestFit: "Орон сууцны засвар, арилжааны барилга", resume: "Оюунцэцэг бол 6 жилийн туршлагатай сантехникч. Ус, дулааны системд мэргэшсэн." },
  },

  {
    id: 11, name: "Цэрэнпунцаг Батжаргал", age: 52, location: "Улаанбаатар – Баянгол",
    category: "Хамгаалагч", years: 20, salary: 1400000, available: true, availableFrom: "Шууд",
    phone: "+97699456789", email: "tserenp.batjargal@mail.mn",
    photo: "https://i.pravatar.cc/300?img=8", poster: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=70",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    pitch: "20 жил хамгаалагч. Цэрэгт 5 жил алба хаасан. Ор, шөнийн ээлж боломжтой.",
    about: "Цэргийн алба хаасны дараа 20 жил хамгаалагчаар ажилласан. Шөнийн ээлж, объект хамгаалах, камерын хяналтанд туршлагатай.",
    skills: ["Объект хамгаалах", "CCTV хяналт", "Эхний тусламж", "Урьдчилан сэргийлэх", "Тайлан бичих"],
    certs: ["Хамгаалагчийн мэргэжлийн гэрчилгээ", "Эхний тусламжийн сертификат"],
    experience: [
      { role: "Ахлах хамгаалагч", org: "Хан Гардиа ХХК", period: "2010–2024" },
      { role: "Хамгаалагч", org: "Номин Холдинг", period: "2004–2010" },
    ],
    education: [{ degree: "Цэргийн алба (5 жил)", school: "МАЦ", period: "1994–1999" }],
    verified: { phone: true, id: true, skill: true },
    transcript: "Намайг Цэрэнпунцаг гэдэг. Цэргийн алба хаасны дараа 20 жил хамгаалагчаар ажилласан. Шөнийн ээлжид дассан, найдвартай.",
    ai: { coreSkill: "Объект хамгаалалт", level: "Ахисан түвшин", strengths: ["20 жилийн туршлага", "Цэргийн дэвсгэр", "Шөнийн ээлж"], bestFit: "Аж ахуйн объект, худалдааны төв", resume: "Цэрэнпунцаг бол 20 жилийн туршлагатай хамгаалагч. Цэргийн дэвсгэртэй, найдвартай." },
  },

  {
    id: 12, name: "Сарнай Батэрдэнэ", age: 27, location: "Улаанбаатар – Сүхбаатар",
    category: "Цэвэрлэгч", years: 5, salary: 1250000, available: true, availableFrom: "Шууд",
    phone: "+97688112233", email: "sarnai.baaterdene@gmail.com",
    photo: "https://i.pravatar.cc/300?img=44", poster: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=70",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    pitch: "Оффис, орон сууц, эмнэлэг. Химийн бодисын мэдлэгтэй. Ажилсаг, цэгцтэй.",
    about: "Оффис, зочид буудал, эмнэлэгт 5 жил цэвэрлэгчээр ажилласан. Химийн цэвэрлэгчийн бодисын мэдлэгтэй, эрүүл ахуйн стандарт сахидаг.",
    skills: ["Гүн цэвэрлэгэ", "Химийн бодис хэрэглэлт", "Эмнэлгийн цэвэрлэгэ", "Хог ангилал", "Цэгцлэлт"],
    certs: ["Эрүүл ахуйн цэвэрлэгэ гэрчилгээ"],
    experience: [
      { role: "Цэвэрлэгч", org: "Номин Дэпартмент стор", period: "2021–2024" },
      { role: "Цэвэрлэгч", org: "Ramada зочид буудал", period: "2019–2021" },
    ],
    education: [{ degree: "Бүрэн дунд", school: "УБ 56-р сургууль", period: "2013–2019" }],
    verified: { phone: true, id: true, skill: false },
    transcript: "Намайг Сарнай гэдэг. 5 жил цэвэрлэгчээр ажилласан. Оффис, зочид буудал, дэпартмент сторд. Цаг барьдаг, ажилсаг.",
    ai: { coreSkill: "Мэргэжлийн цэвэрлэгэ", level: "Дунд түвшин", strengths: ["Цаг баримтална", "Химийн мэдлэгтэй", "Туршлагатай"], bestFit: "Оффис, зочид буудал, дэлгүүр", resume: "Сарнай бол 5 жилийн туршлагатай цэвэрлэгч. Оффис, зочид буудал, эмнэлэгт ажилласан." },
  },

  {
    id: 13, name: "Мандахбаяр Гомбо", age: 36, location: "Улаанбаатар – Баянзүрх",
    category: "Цахилгаанчин", years: 13, salary: 2700000, available: true, availableFrom: "Шууд",
    phone: "+97699567890", email: "mandakh.gombo@yahoo.com",
    photo: "https://i.pravatar.cc/300?img=17", poster: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=70",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    pitch: "Хүчдэлийн шугам, трансформатор, 10кВ хүртэл. Гадна болон дотор угсралт.",
    about: "Дунд хүчдэлийн цахилгааны систем, трансформаторын угсралт, засварт 13 жил ажилласан. 10кВ хүртэлх хүчдэлийн ажилд зөвшөөрөлтэй.",
    skills: ["Дунд хүчдэл 10кВ", "Трансформатор", "Шугам татлага", "Релейн хамгаалалт", "Кабель суурилуулалт"],
    certs: ["IV зэргийн цахилгаанчин", "10кВ ажиллах зөвшөөрөл"],
    experience: [
      { role: "Ахлах цахилгаанчин", org: "УБЦТС ХК", period: "2015–2024" },
      { role: "Цахилгаанчин", org: "Монэнерго ХХК", period: "2011–2015" },
    ],
    education: [{ degree: "Цахилгааны инженер", school: "ШУТИС", period: "2007–2011" }],
    verified: { phone: true, id: true, skill: true },
    transcript: "Намайг Мандахбаяр гэдэг. 13 жил цахилгааны системд ажилласан. 10кВ хүчдэлийн зөвшөөрөлтэй, трансформатор, шугам татлагад мэргэшсэн.",
    ai: { coreSkill: "Дунд хүчдэлийн систем", level: "Ахисан түвшин", strengths: ["10кВ зөвшөөрөл", "Трансформатор", "УБЦТС туршлага"], bestFit: "Эрчим хүч, том барилгын төсөл", resume: "Мандахбаяр бол 13 жилийн туршлагатай цахилгаанчин. Дунд хүчдэл, трансформаторт мэргэшсэн." },
  },

  {
    id: 14, name: "Уранчимэг Дулам", age: 30, location: "Улаанбаатар – Чингэлтэй",
    category: "Тогооч", years: 7, salary: 1700000, available: true, availableFrom: "1 долоо хоногийн дотор",
    phone: "+97699678901", email: "uranchimeg.dulam@gmail.com",
    photo: "https://i.pravatar.cc/300?img=38", poster: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=70",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    pitch: "Монгол, хятад, японы хоол. Суши, рамен. Хурдан, цэвэр.",
    about: "Монгол, Азийн хоол хийх 7 жилийн туршлагатай. Суши, рамен, банши бэлтгэлд мэргэшсэн. Ажилсаг, хурдан.",
    skills: ["Монгол хоол", "Суши", "Рамен", "Хятад хоол", "Гал тогооны менежмент"],
    certs: ["Хоолны эрүүл ахуй", "Суши мастер — 2022"],
    experience: [
      { role: "Тогооч", org: "Tokyo Sushi ресторан", period: "2021–2024" },
      { role: "Туслах тогооч", org: "Монгол Нутаг ресторан", period: "2017–2021" },
    ],
    education: [{ degree: "Хоол хийх урлаг", school: "ДДТДС", period: "2013–2017" }],
    verified: { phone: true, id: true, skill: true },
    transcript: "Намайг Уранчимэг гэдэг. 7 жил тогоочоор ажилласан. Суши, рамен, монгол хоолд мэргэшсэн.",
    ai: { coreSkill: "Азийн хоол", level: "Дунд түвшин", strengths: ["Суши мастер", "Олон улсын туршлага", "Хурдан"], bestFit: "Азийн ресторан, хоолны гэр", resume: "Уранчимэг бол 7 жилийн туршлагатай тогооч. Монгол болон Азийн хоолд мэргэшсэн." },
  },

  {
    id: 15, name: "Энхбаяр Тэрбиш", age: 40, location: "Орхон",
    category: "Барилгачин", years: 17, salary: 2100000, available: true, availableFrom: "2 долоо хоногийн дотор",
    phone: "+97699789012", email: "enkhbayar.terbish@mail.mn",
    photo: "https://i.pravatar.cc/300?img=14", poster: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=70",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    pitch: "Бетон, тоосгоны ажил, тавцан. Орон сууц, олон давхар барилга. Ажлын ахлагч.",
    about: "Орон сууц, арилжааны барилгын нийт 17 жилийн туршлагатай барилгачин. Бетон цутгалт, тоосгоны ажил, тавцан хийцэнд мэргэшсэн. Ажлын ахлагчаар ажиллаж байсан туршлагатай.",
    skills: ["Бетон цутгалт", "Тоосгоны ажил", "Хучилт тавих", "Засал чимэглэл", "Ажлын ахлагч"],
    certs: ["Барилгын техникч II зэрэг", "Ажлын аюулгүй байдал"],
    experience: [
      { role: "Ажлын ахлагч", org: "Орхон Барилга ХХК", period: "2016–2024" },
      { role: "Барилгачин", org: "МБА Констракшн", period: "2007–2016" },
    ],
    education: [{ degree: "Барилга, архитектур", school: "ШУТИС Орхон салбар", period: "2003–2007" }],
    verified: { phone: true, id: true, skill: true },
    transcript: "Намайг Энхбаяр гэдэг. 17 жил барилгачнаар ажилласан. Ажлын ахлагчаар хэд хэдэн том төслийг удирдсан туршлагатай.",
    ai: { coreSkill: "Бетон, тоосгоны ажил", level: "Ахисан түвшин", strengths: ["Ахлагчийн туршлага", "17 жил", "Том төсөл"], bestFit: "Орон сууц, олон давхар барилга", resume: "Энхбаяр бол 17 жилийн туршлагатай барилгачин ахлагч. Орон сууц, том барилгын төслүүдийг удирдсан." },
  },

  {
    id: 16, name: "Золзаяа Нямдорж", age: 23, location: "Улаанбаатар – Налайх",
    category: "Зөөгч", years: 2, salary: 1200000, available: true, availableFrom: "Шууд",
    phone: "+97699890123", email: "zolzaya.nyamdorj@gmail.com",
    photo: "https://i.pravatar.cc/300?img=48", poster: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=70",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    pitch: "Хурдан, найрсаг. Хоол, кофе. Ачаалал ихтэй үед ч инээмсэглэлтэй.",
    about: "2 жил ресторан, кофе шопод зөөгчөөр ажилласан. Харилцааны ур чадвар сайн, ачаалал ихтэй үед тайван байдаг. Ахиад суралцах хүсэлтэй.",
    skills: ["Зочны үйлчилгээ", "Кофе бэлтгэл", "Кассын систем", "Англи хэл", "Багаар ажиллах"],
    certs: ["Барист сургалт — 2023"],
    experience: [
      { role: "Зөөгч-Барист", org: "Good Coffee UB", period: "2023–2024" },
      { role: "Зөөгч", org: "Хаан Буузны газар", period: "2022–2023" },
    ],
    education: [{ degree: "Аялал жуулчлал (дутуу)", school: "МУБИС", period: "2021–2023" }],
    verified: { phone: true, id: false, skill: false },
    transcript: "Намайг Золзаяа гэдэг. 2 жил кофе шоп, рестораны зөөгчөөр ажилласан. Харилцааны ур чадвар сайн, хурдан суралцдаг.",
    ai: { coreSkill: "Зочны үйлчилгээ", level: "Анхан түвшин", strengths: ["Харилцааны ур чадвар", "Барист", "Залуу, идэвхтэй"], bestFit: "Кофе шоп, ресторан", resume: "Золзаяа бол 2 жилийн туршлагатай залуу зөөгч. Барист сургалт дүүргэсэн, хурдан суралцдаг." },
  },

  {
    id: 17, name: "Батсайхан Дагвадорж", age: 44, location: "Улаанбаатар – Хан-Уул",
    category: "Гагнуурчин", years: 20, salary: 3200000, available: false, availableFrom: "2026 оны 9-р сараас",
    phone: "+97699901234", email: "batsaikhan.dagva@gmail.com",
    photo: "https://i.pravatar.cc/300?img=16", poster: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=70",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    pitch: "ASME, API 1104 гэрчилгээтэй. Хоолой, даралтат сав, нисэх онгоцны аж ахуй.",
    about: "20 жилийн туршлагатай мэргэжлийн гагнуурчин. ASME болон API 1104 олон улсын гэрчилгээтэй. Нисэх онгоц, газрын тосны томоохон төслүүдэд ажилласан.",
    skills: ["ASME гагнуур", "API 1104", "Нисэхийн аж ахуй", "TIG/MIG", "Чанарын хяналт"],
    certs: ["ASME гэрчилгээ", "API 1104 гэрчилгээ", "Нисэхийн аж ахуйн зөвшөөрөл"],
    experience: [
      { role: "Мэргэжлийн гагнуурчин", org: "MCS Aerospace", period: "2018–2024" },
      { role: "Ахлах гагнуурчин", org: "Petro China туслан гүйцэтгэгч", period: "2009–2018" },
    ],
    education: [{ degree: "Гагнуурын инженер", school: "ШУТИС", period: "2000–2004" }],
    verified: { phone: true, id: true, skill: true },
    transcript: "Намайг Батсайхан гэдэг. 20 жил гагнуурчнаар ажилласан. ASME, API 1104 гэрчилгээтэй. Нисэхийн аж ахуй, газрын тосны томоохон төслүүдэд ажилласан туршлагатай.",
    ai: { coreSkill: "ASME/API гагнуур", level: "Эксперт", strengths: ["ASME гэрчилгээ", "Нисэхийн туршлага", "20 жил"], bestFit: "Aerospace, газрын тос, хий", resume: "Батсайхан бол 20 жилийн туршлагатай эксперт гагнуурчин. ASME, API 1104 гэрчилгээтэй." },
  },

  {
    id: 18, name: "Пүрэвсүрэн Лхамсүрэн", age: 35, location: "Улаанбаатар – Баянгол",
    category: "Мужаан", years: 12, salary: 2300000, available: true, availableFrom: "Шууд",
    phone: "+97688334455", email: "purevsuren.lkh@mail.mn",
    photo: "https://i.pravatar.cc/300?img=22", poster: "https://images.unsplash.com/photo-1601564921647-b446839a013f?w=800&q=70",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    pitch: "Тавилга, засал чимэглэл, хаалга цонх. Тооцоо гарган, бие даан ажилладаг.",
    about: "12 жилийн туршлагатай мужаан. Орон сууцны засал, тавилга хийц, хаалга цонхны суурилуулалтад мэргэшсэн. Захиалагчтай шууд ажиллаж, хугацаандаа дуусгадаг.",
    skills: ["Тавилга хийц", "Хаалга цонх", "Пардосны хийц", "Шал", "CAD зураг"],
    certs: ["Мужааны II зэрэг", "Модон эдлэлийн чанарын гэрчилгээ"],
    experience: [
      { role: "Ахлах мужаан", org: "ВудМастер ХХК", period: "2017–2024" },
      { role: "Мужаан", org: "Гэр Засал ХХК", period: "2012–2017" },
    ],
    education: [{ degree: "Барилгын тусгай мэргэжил", school: "БТС", period: "2008–2012" }],
    verified: { phone: true, id: true, skill: true },
    transcript: "Намайг Пүрэвсүрэн гэдэг. 12 жил мужаанаар ажилласан. Тавилга, засал, хаалга цонхонд мэргэшсэн. Хугацаандаа дуусгадаг.",
    ai: { coreSkill: "Тавилга, засал чимэглэл", level: "Ахисан түвшин", strengths: ["12 жил", "Тооцоо гаргадаг", "Хугацаандаа"], bestFit: "Орон сууцны засал, тавилгын үйлдвэр", resume: "Пүрэвсүрэн бол 12 жилийн туршлагатай мужаан. Тавилга, засал чимэглэлд мэргэшсэн." },
  },

  {
    id: 19, name: "Дэлгэрмаа Ганболд", age: 29, location: "Улаанбаатар – Сүхбаатар",
    category: "Захиргааны туслах", years: 5, salary: 1800000, available: true, availableFrom: "Шууд",
    phone: "+97699012345", email: "delgermaa.ganbold@gmail.com",
    photo: "https://i.pravatar.cc/300?img=42", poster: "https://images.unsplash.com/photo-1497366412874-3415097a27e7?w=800&q=70",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    pitch: "Гүйцэтгэх захирлын туслах. Хуваарь, уулзалт, аялал. Нууцлал, нямбай.",
    about: "5 жил гүйцэтгэх захирлын туслахаар ажилласан. Хуваарь зохион байгуулалт, корпорат харилцаа, бичиг баримт боловсруулалтад мэргэшсэн. Монгол, англи хэлний орчуулга хийдэг.",
    skills: ["Хуваарь зохион байгуулалт", "Microsoft 365", "Корпорат харилцаа", "Орчуулга MN/EN", "PowerPoint"],
    certs: ["IELTS 6.5", "Захиргааны мэргэжлийн гэрчилгээ — 2023"],
    experience: [
      { role: "Гүйцэтгэх захирлын туслах", org: "Монголын Алт ХХК", period: "2021–2024" },
      { role: "Захиргааны туслах", org: "OT Corporate Services", period: "2019–2021" },
    ],
    education: [{ degree: "Бизнесийн удирдлага (БС)", school: "МУИС", period: "2015–2019" }],
    verified: { phone: true, id: true, skill: true },
    transcript: "Намайг Дэлгэрмаа гэдэг. 5 жил гүйцэтгэх захирлын туслахаар ажилласан. Хуваарь зохион байгуулалт, корпорат харилцаа, англи орчуулга хийдэг.",
    ai: { coreSkill: "Гүйцэтгэх захирлын туслах", level: "Дунд түвшин", strengths: ["Англи хэлтэй", "Корпорат туршлага", "Нямбай"], bestFit: "Гүйцэтгэх захирлын туслах, корпорат байгууллага", resume: "Дэлгэрмаа бол 5 жилийн туршлагатай гүйцэтгэх захирлын туслах. IELTS 6.5, англи орчуулгад чадвартай." },
  },

  {
    id: 20, name: "Мөнхтөр Цэдэв", age: 31, location: "Улаанбаатар – Баянзүрх",
    category: "Барилгачин", years: 8, salary: 1950000, available: true, availableFrom: "Шууд",
    phone: "+97699123012", email: "munkhtoor.tsedev@mail.mn",
    photo: "https://i.pravatar.cc/300?img=13", poster: "https://images.unsplash.com/photo-1517948430535-1e2469d314fe?w=800&q=70",
    video: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    pitch: "Засал чимэглэл, будаг, шал, гипс. Орон сууцны цогц засварыг бие даан гүйцэтгэнэ.",
    about: "Орон сууцны цогц засвар, засал чимэглэлд 8 жил ажилласан. Будаг, шал хучилт, гипсокартон, хаалга цонхны суурилуулалтад мэргэшсэн. Ажилч, цаг баримтална.",
    skills: ["Будаг засвар", "Шал хучилт", "Гипсокартон", "Хаалга цонх", "Ханын бетон засал"],
    certs: ["Барилгын засалчийн II зэрэг"],
    experience: [
      { role: "Засал чимэглэлийн мастер", org: "Гэр Шинэчлэл ХХК", period: "2019–2024" },
      { role: "Барилгачин", org: "Орон сууцны засвар", period: "2016–2019" },
    ],
    education: [{ degree: "Барилгын тусгай мэргэжил", school: "БТС", period: "2012–2016" }],
    verified: { phone: true, id: true, skill: false },
    transcript: "Намайг Мөнхтөр гэдэг. 8 жил орон сууцны засвар, засал чимэглэлийн ажил хийсэн. Будаг, шал, гипс, хаалга цонхыг бие даан хийдэг.",
    ai: { coreSkill: "Орон сууцны засал чимэглэл", level: "Дунд түвшин", strengths: ["Бие даан ажилладаг", "Олон чадвартай", "Цаг баримтална"], bestFit: "Орон сууцны засвар, засал", resume: "Мөнхтөр бол 8 жилийн туршлагатай засал чимэглэлийн мастер. Орон сууцны цогц засварыг бие даан гүйцэтгэдэг." },
  },

];



// ── AI Match Scores ──────────────────────────────────

const AI_MATCH = {

  1: { score: 94, grade: "A+", reasons: ["8 жилийн туршлага", "AWS D1.1 гэрчилгээтэй", "Хүссэн цалин таарч байна", "Улаанбаатарт байршдаг"], flags: [] },

  2: { score: 88, grade: "A",  reasons: ["Хөдөлмөрийн гэрчилгээтэй", "5 жилийн туршлага", "Тиймийн хамтрагч компанид ажилласан"], flags: ["Цалин хүсэлт өндөр"] },

  3: { score: 91, grade: "A+", reasons: ["Барилгын мэргэжлийн диплом", "7 жил ажилласан", "Эрдэнэт, UB хоёуланд ажиллаж байсан"], flags: [] },

  4: { score: 76, grade: "B+", reasons: ["3 жилийн туршлага", "Машины жолооны эрхтэй"], flags: ["Туршлага харьцангуй бага", "Ажлын нас залуу"] },

  5: { score: 82, grade: "A-", reasons: ["Тогооны мэргэжлийн сургуулиас төгссөн", "Гадаадад 4 жил ажилласан"], flags: ["Монгол хоолны туршлага хязгаарлагдмал"] },

  6: { score: 79, grade: "B+", reasons: ["Хэд хэдэн байгууллагад ажилласан", "Ирэх сарт ажиллах боломжтой"], flags: ["Хамгийн сүүлийн ажил нь 6 сарын өмнө"] },

  7:  { score: 85, grade: "A",  reasons: ["Нягтлан бодогчийн 5 жилийн туршлага", "ACCA оюутан"], flags: [] },
  8:  { score: 87, grade: "A",  reasons: ["10 жилийн туршлага", "5 одтой зочид буудалд ажилласан", "Олон улсын гэрчилгээтэй"], flags: [] },
  9:  { score: 90, grade: "A+", reasons: ["22 жил ослгүй жолоочлосон", "D ангилал", "Найдвартай"], flags: [] },
  10: { score: 80, grade: "A-", reasons: ["6 жил сантехникчаар", "Орон сууц, офис хоёуланд туршлагатай"], flags: [] },
  11: { score: 78, grade: "B+", reasons: ["20 жил хамгаалагч", "Цэргийн дэвсгэр"], flags: ["Ахимаг нас"] },
  12: { score: 72, grade: "B",  reasons: ["5 жилийн туршлага", "Зочид буудал, дэлгүүрт ажилласан"], flags: [] },
  13: { score: 92, grade: "A+", reasons: ["13 жил цахилгааны системд", "10кВ зөвшөөрөл", "УБЦТС туршлага"], flags: [] },
  14: { score: 83, grade: "A-", reasons: ["7 жил тогооч", "Суши мастер гэрчилгээтэй"], flags: [] },
  15: { score: 86, grade: "A",  reasons: ["17 жил барилгачнаар", "Ажлын ахлагчаар ажилласан"], flags: [] },
  16: { score: 65, grade: "B-", reasons: ["Харилцааны ур чадвар сайн", "Барист гэрчилгээтэй"], flags: ["Туршлага бага", "Боловсрол дутуу"] },
  17: { score: 96, grade: "A+", reasons: ["20 жил", "ASME, API 1104 гэрчилгээ", "Нисэхийн туршлага"], flags: [] },
  18: { score: 88, grade: "A",  reasons: ["12 жил мужаанаар", "Тооцоо гаргаж ажилладаг"], flags: [] },
  19: { score: 84, grade: "A-", reasons: ["Гүйцэтгэх захирлын туслахаар 5 жил", "IELTS 6.5", "Корпорат туршлага"], flags: [] },
  20: { score: 77, grade: "B+", reasons: ["8 жил засал чимэглэл", "Бие даан ажилладаг"], flags: [] },

};



// ── AI Career Coach Messages ─────────────────────────

const COACH_PROMPTS = {

  mn: [

    { q: "Яагаад намайг татгалзаж байна вэ?", a: "Таны профайлыг шинжлэхэд 3 гол шалтгаан олдлоо:\n\n1. **Видео CV** байхгүй — ажил олгогчид видеогүй профайлыг 73% бага үздэг\n2. **Гэрчилгээ** дутуу — Таны мэргэжилд AWS эсвэл аналогийн баталгаажуулалт чухал\n3. **Профайл бүрэн биш** — Ур чадварын хэсгийг 60% л бөглөсөн байна\n\n✅ Засвар хийвэл 2 долоо хоногт 3 дахин илүү холбоо авах боломжтой." },

    { q: "Цалингаа хэрхэн нэмэх вэ?", a: "Таны одоогийн мэргэжил, туршлагад үндэслэн:\n\n📊 **Зах зээлийн дундаж:** ₮1,800,000–₮2,400,000\n📈 **Таны одоогийн:** ₮1,500,000\n\n**Цалин нэмэх 3 арга:**\n1. AWS D1.1 гэрчилгээ авах → +₮200,000–300,000\n2. Гагнуурын TIG чадвар нэмэх → +₮150,000\n3. Ахлах гагнуурчны туршлага 1 жил → +₮400,000\n\n🎯 18 сарын дотор ₮2,200,000+ хүрэх боломжтой." },

    { q: "Ямар ур чадвар эзэмшвэл зохих вэ?", a: "Таны мэргэжилд **2025 оны хамгийн эрэлт ихтэй ур чадварууд:**\n\n🔥 **Яаралтай суралцаарай:**\n• TIG/MIG гагнуур — Улаанбаатарт 34 вакансь нээлттэй\n• AutoCAD үндсэн — цалин +15%\n\n📚 **Дараа нь суралцаарай:**\n• AWS D1.1 гэрчилгээ\n• Орос хэл (уул уурхайн компаниудад чухал)\n\n💡 SwipeHire Learning дээр 3 сарын хөнгөлөлттэй сургалт авах боломжтой." },

    { q: "Надад ямар ажил тохирох вэ?", a: "AI шинжилгээ дараах ажлуудыг танд санал болгож байна:\n\n🥇 **94% тохирол** — Монголын Ган ХХК, Ахлах Гагнуурчин ₮2,500,000\n🥈 **89% тохирол** — BuildPro Construction, Тусгай Гагнуурчин ₮2,200,000\n🥉 **84% тохирол** — Эрдэнэт Үйлдвэр, Гагнуур слесарь ₮2,800,000\n\n📍 Бүгд Улаанбаатарт байрладаг, таны тохиромжтой." },

  ],

  en: [

    { q: "Why am I getting rejected?", a: "After analyzing your profile, I found 3 key reasons:\n\n1. **No Video CV** — employers view profiles without video 73% less\n2. **Missing certificates** — AWS or equivalent verification is critical in your field\n3. **Incomplete profile** — only 60% of your skills section is filled\n\n✅ Fix these to get 3x more responses within 2 weeks." },

    { q: "How can I increase my salary?", a: "Based on your experience and field:\n\n📊 **Market average:** ₮1,800,000–₮2,400,000\n📈 **Your current:** ₮1,500,000\n\n**3 ways to increase:**\n1. Get AWS D1.1 cert → +₮200,000–300,000\n2. Add TIG welding skill → +₮150,000\n3. 1 year senior experience → +₮400,000\n\n🎯 You can reach ₮2,200,000+ within 18 months." },

    { q: "What skills should I learn?", a: "**Most in-demand skills for 2025** in your field:\n\n🔥 **Learn now:**\n• TIG/MIG welding — 34 open vacancies in UB\n• AutoCAD basics — +15% salary\n\n📚 **Learn next:**\n• AWS D1.1 certification\n• Russian language (critical for mining companies)\n\n💡 Discounted 3-month courses available on SwipeHire Learning." },

    { q: "Which jobs fit me best?", a: "AI analysis recommends these jobs for you:\n\n🥇 **94% match** — Mongolian Steel LLC, Senior Welder ₮2,500,000\n🥈 **89% match** — BuildPro Construction, Specialist Welder ₮2,200,000\n🥉 **84% match** — Erdenet Factory, Welder/Fitter ₮2,800,000\n\n📍 All located in Ulaanbaatar, matching your preference." },

  ],

};



// ── AI Recruiter Prompts ─────────────────────────────

const RECRUITER_PROMPTS = {

  mn: [

    { q: "Ажлын байрны зар үүсгэ", tag: "📝 Зар үүсгэх" },

    { q: "Нэр дэвшигчдийг эрэмбэл", tag: "🏆 Эрэмбэлэх" },

    { q: "Ярилцлагын асуулт үүсгэ", tag: "❓ Асуулт" },

    { q: "Хамгийн тохирох нэр дэвшигчийг санал бол", tag: "🎯 Санал" },

  ],

  en: [

    { q: "Generate a job description", tag: "📝 Generate JD" },

    { q: "Rank candidates by fit", tag: "🏆 Rank" },

    { q: "Generate interview questions", tag: "❓ Questions" },

    { q: "Recommend best candidate", tag: "🎯 Recommend" },

  ],

};



const RECRUITER_ANSWERS = {

  mn: {

    "Ажлын байрны зар үүсгэ": "## Гагнуурчин — Ажлын байрны зар\n\n**Компани:** SwipeHire Partner\n**Байршил:** Улаанбаатар\n**Цалин:** ₮1,800,000–₮2,500,000\n\n### Тавигдах шаардлага:\n• MIG/TIG гагнуурын 3+ жилийн туршлага\n• AWS D1.1 гэрчилгээ (давуу тал)\n• Металл болон хайлшийн мэдлэг\n• Нарийн ажиллагаа, хариуцлагатай байдал\n\n### Үүрэг хариуцлага:\n• Техникийн зурагт үндэслэн гагнуурын ажил гүйцэтгэх\n• Чанарын стандарт мөрдөх\n• Багийн бүрэлдэхүүнтэй хамтран ажиллах\n\n**Өргөдлөө SwipeHire-р илгээнэ үү →**",

    "Нэр дэвшигчдийг эрэмбэл": "## AI Эрэмбэлэлт — Гагнуурчин\n\n| # | Нэр | Оноо | Үндэслэл |\n|---|-----|------|----------|\n| 🥇 | Батболд Д. | **94%** | 8 жил, AWS гэрчилгээ |\n| 🥈 | Мөнхбат Г. | **91%** | 7 жил, барилгын диплом |\n| 🥉 | Энхбаяр Т. | **88%** | 5 жил, хөдөлмөрийн гэрчилгээ |\n| 4 | Болд-Эрдэнэ | **85%** | 5 жил, ACCA оюутан |\n| 5 | Зандан Б. | **82%** | 4 жил, гадаадад ажилласан |\n\n✅ **Санал:** Батболд, Мөнхбат нарыг ярилцлагад урина уу.",

    "Ярилцлагын асуулт үүсгэ": "## Гагнуурчны ярилцлагын асуулт\n\n**Техникийн асуултууд:**\n1. MIG болон TIG гагнуурын ялгааг тайлбарлана уу\n2. AWS D1.1 стандарт гэж юу болох вэ?\n3. Гагнуурын ул мөрийг хэрхэн шалгадаг вэ?\n\n**Зан байдлын асуулт:**\n4. Хамгийн хэцүү гагнуурын ажлаа дүрслэн ярина уу\n5. Аюулгүй ажиллагааны зөрчил гарсан үедээ яаж шийдэж байсан бэ?\n\n**Нийцлийн асуулт:**\n6. Та ротейшн горимд ажиллаж болох уу?\n7. 5 жилийн хугацаанд өөрийгөө хаана харж байна вэ?",

    "Хамгийн тохирох нэр дэвшигчийг санал бол": "## AI Зөвлөмж\n\n### 🎯 Батболд Дорж — **94% тохирол**\n\n**Яагаад тэр?**\n✅ Таны шаардлагатай яг тохирох 8 жилийн туршлага\n✅ AWS D1.1 баталгаажуулалт бий\n✅ Цалингийн хүсэлт таны санал болгосонтой тохирч байна\n✅ Улаанбаатарт байршдаг — зардал байхгүй\n✅ Шууд ажилд орох боломжтой\n\n**Анхааруулга:**\nАнхлан ярилцлагын дараа 48 цагийн дотор санал тавина уу — тэр 3 компанийн санал хүлээж байгаа.",

  },

  en: {

    "Generate a job description": "## Welder — Job Description\n\n**Company:** SwipeHire Partner\n**Location:** Ulaanbaatar\n**Salary:** ₮1,800,000–₮2,500,000\n\n### Requirements:\n• 3+ years MIG/TIG welding experience\n• AWS D1.1 certification (preferred)\n• Knowledge of metals and alloys\n• Precision and accountability\n\n### Responsibilities:\n• Execute welding work based on technical drawings\n• Maintain quality standards\n• Collaborate with team members\n\n**Apply via SwipeHire →**",

    "Rank candidates by fit": "## AI Ranking — Welder Position\n\n| # | Name | Score | Reason |\n|---|------|-------|--------|\n| 🥇 | Batbold D. | **94%** | 8 yrs, AWS cert |\n| 🥈 | Munkhbat G. | **91%** | 7 yrs, construction diploma |\n| 🥉 | Enkhbayar T. | **88%** | 5 yrs, labor certificate |\n| 4 | Bold-Erdene | **85%** | 5 yrs, ACCA student |\n| 5 | Zandan B. | **82%** | 4 yrs, overseas experience |\n\n✅ **Recommendation:** Invite Batbold and Munkhbat for interviews.",

    "Generate interview questions": "## Welder Interview Questions\n\n**Technical:**\n1. Explain the difference between MIG and TIG welding\n2. What is the AWS D1.1 standard?\n3. How do you inspect weld quality?\n\n**Behavioral:**\n4. Describe your most challenging welding project\n5. How did you handle a safety violation situation?\n\n**Fit:**\n6. Are you open to rotation schedules?\n7. Where do you see yourself in 5 years?",

    "Recommend best candidate": "## AI Recommendation\n\n### 🎯 Batbold Dorj — **94% match**\n\n**Why him?**\n✅ Exactly 8 years matching your requirements\n✅ Has AWS D1.1 certification\n✅ Salary expectations match your offer\n✅ Based in Ulaanbaatar — no relocation cost\n✅ Available to start immediately\n\n**Warning:**\nAfter initial interview, make your offer within 48 hours — he has 3 other pending offers.",

  },

};



// ── Ажлын зар (ажил хайгч feed-д харагдах) ──────────

const JOBS = [

  {

    id: 1,

    company: "Номин Нэгдэл ХХК",

    logo: "НН",

    logoColor: "#3DDC97",

    role: "Захиргааны туслах",

    location: "Улаанбаатар – Сүхбаатар",

    salary: "1,500,000–2,000,000",

    type: "Бүтэн цагийн",

    about: "Идэвхтэй, цэгцтэй ажилтан хайж байна. Excel, имэйл харилцааны туршлагатай байх шаардлагатай. Дарга нарын хуваарь, баримт бичиг зохион байгуулна.",

    skills: ["Microsoft Excel", "Имэйл & Outlook", "Тайлан бичих"],

    poster: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=70",

    benefits: ["Амралтын өдрүүд", "Цай хоол", "Урамшуулал"],

    urgent: true,

  },

  {

    id: 2,

    company: "МегаМаркет",

    logo: "ММ",

    logoColor: "#FF6B35",

    role: "Ахлах худалдагч",

    location: "Улаанбаатар – Баянгол",

    salary: "1,200,000–1,800,000",

    type: "Бүтэн цагийн",

    about: "Хэрэглэгчтэй харьцах дуртай, борлуулалтад сонирхолтой хүн хайж байна. Туршлага шаардахгүй — сургана.",

    skills: ["Харилцагчтай ажиллах", "Борлуулалт", "Багаар ажиллах"],

    poster: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=70",

    benefits: ["Борлуулалтын шагнал", "Хоол", "Тусгай хөнгөлөлт"],

    urgent: false,

  },

  {

    id: 3,

    company: "SocialMN Agency",

    logo: "SM",

    logoColor: "#a78bfa",

    role: "SMM менежер",

    location: "Улаанбаатар (Зайнаас боломжтой)",

    salary: "1,800,000–2,500,000",

    type: "Хэсэгчилсэн / Бүтэн",

    about: "Facebook, Instagram, TikTok контент бүтээж, хуудас удирдах чадвартай хүн хайна. Видео найруулга мэдвэл давуу тал.",

    skills: ["Facebook хуудас удирдах", "Instagram контент", "TikTok видео", "Видео монтаж"],

    poster: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&q=70",

    benefits: ["Зайнаас ажиллах", "Уян цагийн хуваарь", "Тоног төхөөрөмж"],

    urgent: false,

  },

  {

    id: 4,

    company: "ТурниТрейд ХХК",

    logo: "ТТ",

    logoColor: "#fbbf24",

    role: "Агуулахын ажилтан",

    location: "Улаанбаатар – Налайх",

    salary: "1,400,000–1,700,000",

    type: "Бүтэн цагийн",

    about: "Агуулахын бараа хүлээн авах, бүртгэх, хадгалах ажил. Форклифт жолоодох чадвартай байвал давуу тал.",

    skills: ["Агуулах удирдлага", "Боолт савлагаа", "Хог ангилах"],

    poster: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=70",

    benefits: ["Нийтийн тээвэр", "Хоол", "Даатгал"],

    urgent: true,

  },

  {

    id: 5,

    company: "Кофе Манго",

    logo: "КМ",

    logoColor: "#f97316",

    role: "Барист & Зөөгч",

    location: "Улаанбаатар – Хан-Уул",

    salary: "1,000,000–1,400,000",

    type: "Уян цагийн",

    about: "Хэрэглэгчтэй харьцах дуртай, инээмсэглэлтэй хүн хайна. Сургалт өгнө. 18+ настай байх.",

    skills: ["Харилцагчтай ажиллах", "Багаар ажиллах", "Тогооч & гал тогоо"],

    poster: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=70",

    benefits: ["Хоол үнэгүй", "Зөөгчийн тип", "Ажилтны хөнгөлөлт"],

    urgent: false,

  },

];



// Нэр дэвшигчийн инициал (овог нэрний эхний үсэг)

const initials = (name) => {

  const parts = name.trim().split(/\s+/);

  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");

};



/* ── Жишээ танилцуулга видео (код дотор үүсгэсэн SVG) ──

   Гадны видео файлгүйгээр найдвартай ажиллах "видео" танилцуулга.

   Мэргэжлийн өнгө, инициал, REC тэмдэг, дуу долгионы хөдөлгөөнтэй. */

function VideoIntro({ c, playing }) {

  const { lang } = useLang();

  const accent = TRADE[c.category]?.hex || "#FF6B35";

  const id = `g${c.id}`;

  return (

    <svg className="vintro" viewBox="0 0 360 640" preserveAspectRatio="xMidYMid slice"

      xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`${c.name} танилцуулга`}>

      <defs>

        <radialGradient id={`${id}r`} cx="50%" cy="32%" r="75%">

          <stop offset="0%" stopColor={accent} stopOpacity="0.55" />

          <stop offset="55%" stopColor={accent} stopOpacity="0.14" />

          <stop offset="100%" stopColor="var(--bg)" stopOpacity="1" />

        </radialGradient>

        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="1">

          <stop offset="0%" stopColor="var(--bg-2)" />

          <stop offset="100%" stopColor="#000000" />

        </linearGradient>

      </defs>



      <rect width="360" height="640" fill={`url(#${id}b)`} />

      <rect width="360" height="640" fill={`url(#${id}r)`} />



      {/* инициал бүхий том тойрог */}

      <circle cx="180" cy="232" r="92" fill="none" stroke={accent} strokeWidth="2.5" opacity="0.65" />

      <circle cx="180" cy="232" r="78" fill={accent} opacity="0.16" />

      <text x="180" y="232" textAnchor="middle" dominantBaseline="central"

        fontFamily="'Barlow Condensed', sans-serif" fontWeight="700" fontSize="78"

        fill={accent} letterSpacing="2">{initials(c.name)}</text>



      {/* мэргэжил */}

      <text x="180" y="356" textAnchor="middle" fontFamily="'Barlow Condensed', sans-serif"

        fontWeight="700" fontSize="26" fill="#f5f3ee" letterSpacing="1"

        style={{ textTransform: "uppercase" }}>{lang === "en" ? (STRINGS.en[c.category] || c.category) : c.category}</text>

      <text x="180" y="388" textAnchor="middle" fontFamily="Inter, sans-serif"

        fontSize="15" fill="#a8a49b">{c.years} {lang === "en" ? "yrs exp" : "жил туршлага"} · {c.location}</text>



      {/* дуу долгион (playing үед хөдөлдөг) */}

      <g transform="translate(180 470)" opacity={playing ? 1 : 0.35}>

        {[...Array(13)].map((_, i) => {

          const x = (i - 6) * 17;

          const base = [14, 26, 40, 22, 54, 34, 64, 30, 50, 24, 42, 28, 16][i];

          return (

            <rect key={i} x={x - 4} y={-base / 2} width="7" height={base} rx="3.5" fill={accent}

              opacity={0.55 + (i % 3) * 0.15}>

              {playing && (

                <animate attributeName="height"

                  values={`${base};${base * 0.35};${base * 1.1};${base * 0.5};${base}`}

                  dur={`${0.9 + (i % 4) * 0.25}s`} repeatCount="indefinite" />

              )}

              {playing && (

                <animate attributeName="y"

                  values={`${-base / 2};${-base * 0.175};${-base * 0.55};${-base * 0.25};${-base / 2}`}

                  dur={`${0.9 + (i % 4) * 0.25}s`} repeatCount="indefinite" />

              )}

            </rect>

          );

        })}

      </g>



      {/* REC тэмдэг */}

      <g transform="translate(28 40)">

        <circle cx="0" cy="0" r="6" fill="#FF3B30">

          <animate attributeName="opacity" values="1;0.25;1" dur="1.4s" repeatCount="indefinite" />

        </circle>

        <text x="14" y="5" fontFamily="Inter, sans-serif" fontSize="14" fontWeight="600"

          fill="#f5f3ee" letterSpacing="1">REC · 0:42</text>

      </g>

    </svg>

  );

}



/* ── Профайл зураг (инициал бүхий тойрог) ── */

function Avatar({ c, size = 64 }) {

  const accent = TRADE[c.category]?.hex || "#FF6B35";

  return (

    <span className="avatar" style={{

      width: size, height: size, background: `${accent}26`,

      border: `2px solid ${accent}`, color: accent,

      fontSize: size * 0.4,

    }}>

      {initials(c.name)}

    </span>

  );

}



/* ── Баталгаажуулалтын систем ────────────────────

   HR хамгийн түрүүнд итгэлцлийг хардаг — итгэлцэл бол

   платформын үндсэн үнэ цэнэ. 3 төрлийн баталгаажуулалт. */

const VERIFY_TYPES = [

  { key: "phone", icon: ShieldCheck, label: "Утас баталгаажсан", short: "Утас" },

  { key: "id", icon: Contact, label: "Иргэний үнэмлэх баталгаажсан", short: "Үнэмлэх" },

  { key: "skill", icon: BadgeCheck, label: "Ур чадвар баталгаажсан", short: "Ур чадвар" },

];



const VERIFY_EN = { phone: "Phone verified", id: "ID verified", skill: "Skill verified" };

const VERIFY_SHORT_EN = { phone: "Phone", id: "ID", skill: "Skills" };



// Бүрэн badge-ууд (профайл дотор)

function VerifyBadges({ v, size = 13 }) {

  const { lang } = useLang();

  const items = VERIFY_TYPES.filter((vt) => v[vt.key]);

  if (!items.length) return null;

  return (

    <div className="vbadges">

      {items.map((vt) => {

        const Icon = vt.icon;

        const lbl = lang === "en" ? VERIFY_EN[vt.key] : vt.label;

        return (

          <span key={vt.key} className="vbadge" title={lbl}>

            <Icon size={size} /> {lbl}

          </span>

        );

      })}

    </div>

  );

}



// Компакт badge мөр (feed карт дээр) — итгэлцлийг шууд харуулна

function VerifyChips({ v }) {

  const { lang } = useLang();

  const done = VERIFY_TYPES.filter((vt) => v[vt.key]);

  if (!done.length) return null;

  return (

    <div className="vchips" aria-label={`${done.length} verified`}>

      {done.map((vt) => {

        const Icon = vt.icon;

        const short = lang === "en" ? VERIFY_SHORT_EN[vt.key] : vt.short;

        return (

          <span key={vt.key} className="vchip" title={lang === "en" ? VERIFY_EN[vt.key] : vt.label}>

            <Icon size={13} /> {short}

          </span>

        );

      })}

    </div>

  );

}



// Итгэлцлийн хэмжүүр (профайлын дээд хэсэгт)

function TrustMeter({ v }) {

  const { t, lang } = useLang();

  const done = VERIFY_TYPES.filter((vt) => v[vt.key]).length;

  const total = VERIFY_TYPES.length;

  const full = done === total;

  return (

    <div className="trust">

      <div className="trust__top">

        <span className="trust__title">

          <ShieldCheck size={15} /> {t("verifyTitle")}

        </span>

        <span className="trust__score" style={{ color: full ? "#3DDC97" : "#FFD23F" }}>

          {done}/{total}

        </span>

      </div>

      <div className="trust__bar">

        {VERIFY_TYPES.map((vt) => (

          <span key={vt.key} className={`trust__seg ${v[vt.key] ? "is-on" : ""}`} />

        ))}

      </div>

      {full && (

        <span className="trust__badge">

          <BadgeCheck size={13} /> {lang === "en" ? "Fully verified candidate" : "Бүрэн баталгаажсан нэр дэвшигч"}

        </span>

      )}

    </div>

  );

}



/* ── Passport Score — moved to src/lib/passport.js (imported at top) ── */

// Pure display component — no state, no hooks, no side effects.
function PassportScoreWidget({ c, lang }) {
  const ps = computePassportScore(c);
  const en = lang === "en" || lang === "ko";

  // SVG ring: r=26 → circumference = 2π×26 ≈ 163.4
  const R = 26, CIRC = 2 * Math.PI * R;
  const dash = (ps.total / 100) * CIRC;

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 16,
      padding: "16px 18px",
      margin: "14px 0",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        {/* Circular ring */}
        <svg width={64} height={64} viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
          <circle cx={32} cy={32} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
          <circle
            cx={32} cy={32} r={R}
            fill="none"
            stroke={ps.color}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC}`}
            transform="rotate(-90 32 32)"
            style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }}
          />
          <text x={32} y={36} textAnchor="middle" fontSize={15} fontWeight={800} fill={ps.color} fontFamily="'Barlow Condensed',sans-serif">
            {ps.total}
          </text>
        </svg>

        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 }}>
            🛂 {en ? (lang === "ko" ? "패스포트 점수" : "Passport Score") : "Паспорт оноо"}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: ps.color, fontFamily: "'Barlow Condensed',sans-serif", lineHeight: 1 }}>
              {ps.total}
            </span>
            <span style={{ fontSize: 13, color: "var(--dim)" }}>/100</span>
            <span style={{
              fontSize: 12, fontWeight: 800, padding: "2px 8px", borderRadius: 8,
              background: ps.color + "22", color: ps.color, border: `1px solid ${ps.color}55`,
              fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 0.5,
            }}>
              {ps.grade}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 3 }}>
            {en ? "Profile strength · 6 dimensions" : "Профайлын хүч · 6 үзүүлэлт"}
          </div>
        </div>
      </div>

      {/* Breakdown bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {ps.breakdown.map((d) => {
          const pct = Math.round((d.val / d.max) * 100);
          const barColor = pct === 100 ? "#3DDC97" : pct >= 60 ? "#4FA3FF" : pct > 0 ? "#FFD23F" : "rgba(255,255,255,0.1)";
          return (
            <div key={d.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: "var(--dim)" }}>{en ? d.labelEn : d.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: barColor }}>{d.val}/{d.max}</span>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 99, background: barColor,
                  width: pct + "%",
                  transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Passport Completion Center ──────────────────── */

function PassportCompletionCard({ f, verified, lang, onAction }) {
  const L = (mn, en, ko) => lang === "mn" ? mn : lang === "ko" ? ko : en;

  const c = { ...f, verified };
  const ps = computePassportScore(c);
  const pct = ps.total;

  // Reward popup on score increase
  const [reward, setReward] = useState(null);
  const prevPct = useRef(pct);
  useEffect(() => {
    const prev = prevPct.current;
    if (pct > prev) {
      const pts = pct - prev;
      setReward({ from: prev, to: pct, pts });
      prevPct.current = pct;
      const id = setTimeout(() => setReward(null), 3200);
      return () => clearTimeout(id);
    }
    prevPct.current = pct;
  }, [pct]);

  const LEVELS = [
    { id: "basic",        label: L("Үндсэн","Basic","기본"),           min: 0  },
    { id: "verified",     label: L("Баталгаажсан","Verified","인증됨"), min: 30 },
    { id: "professional", label: L("Мэргэжлийн","Professional","전문가"), min: 60 },
    { id: "elite",        label: L("Элит","Elite","엘리트"),            min: 85 },
  ];
  const curLevel  = [...LEVELS].reverse().find(lv => pct >= lv.min) || LEVELS[0];
  const nextLevel = LEVELS[LEVELS.indexOf(curLevel) + 1] || null;
  const ptsToNext = nextLevel ? nextLevel.min - pct : 0;

  const TASKS = [
    { id:"photo",        label:L("Профайл зураг нэмэх","Upload Profile Photo","프로필 사진 업로드"),         pts:10, done:!!f.photo,                                          action:"add-photo",    btn:L("Зураг","Photo","사진") },
    { id:"video",        label:L("Видео танилцуулга бичих","Record Video Introduction","영상 소개 녹화"),      pts:15, done:!!(f.videoMode || f.videoFileName || f.videoFile),   action:"add-video",    btn:L("Бичлэг","Video","영상") },
    { id:"experience",   label:L("Ажлын туршлага нэмэх","Add Work Experience","경력 추가"),                  pts:10, done:!!(f.experience?.some(e=>e.role&&e.org)),            action:"edit-step-3",  btn:L("Туршлага","Experience","경력") },
    { id:"certs",        label:L("Гэрчилгээ оруулах","Upload Certificate","자격증 업로드"),                  pts:10, done:(f.certs?.length||0)>0,                              action:"edit-step-7",  btn:L("Гэрчилгээ","Certificate","자격증") },
    { id:"skills",       label:L("Ур чадвар нэмэх (3+)","Add Skills (3+)","스킬 3개+ 추가"),               pts:5,  done:((f.skills?.length||0)+(f.customSkills?.length||0))>=3, action:"edit-step-5",  btn:L("Ур чадвар","Skills","스킬") },
    { id:"verifyPhone",  label:L("Утас баталгаажуулах","Verify Phone","전화 인증"),                          pts:5,  done:!!(verified?.phone),                                  action:"verify-phone", btn:L("Баталгаажуулах","Verify","인증") },
    { id:"email",        label:L("Имэйл нэмэх","Verify Email","이메일 추가"),                               pts:5,  done:!!f.email,                                            action:"add-email",    btn:L("Имэйл","Email","이메일") },
    { id:"salary",       label:L("Хүсэж буй цалин","Add Expected Salary","희망 급여 추가"),                  pts:5,  done:!!f.salary,                                           action:"edit-step-8",  btn:L("Цалин","Salary","급여") },
    { id:"availability", label:L("Ажиллах боломж","Select Availability","가용 시기"),                       pts:5,  done:!!f.availableFrom,                                    action:"edit-step-8",  btn:L("Тохируулах","Set","설정") },
    { id:"about",        label:L("Дэлгэрэнгүй танилцуулга бичих","Write Detailed Bio (50+ chars)","자기소개 50자+"), pts:5, done:(f.about?.trim()?.length||0)>=50,           action:"edit-step-2",  btn:L("Засах","Edit","수정") },
  ];

  const AI_TIPS = {
    photo:       L("Зурагтай профайл 3 дахин илүү харагддаг.","Profiles with a photo get 3× more views.","사진 있는 프로필은 3배 더 조회됩니다."),
    video:       L("Видео танилцуулга ажил олгогчийн итгэлийг нэмэгдүүлдэг.","Adding a video introduction increases employer trust.","영상 소개는 고용주의 신뢰를 즉시 높입니다."),
    certs:       L("Гэрчилгээ паспортын зэрэглэлийг сайжруулна.","Certificates improve your Passport ranking.","자격증은 여권 등급을 향상시킵니다."),
    experience:  L("Туршлага нэмснээр ажил олгогчид таныг илүү харна.","Work experience increases your visibility.","경력을 추가하면 더 많은 고용주에게 노출됩니다."),
    skills:      L("3+ ур чадвар нэмснээр хайлтад илүү харагдана.","Adding 3+ skills boosts your search visibility.","스킬 3개+ 추가로 검색 노출이 늘어납니다."),
    verifyPhone: L("Утасны баталгаажуулалт итгэлцлийн оноог нэмэгдүүлнэ.","Phone verification increases your trust score.","전화 인증으로 신뢰도가 높아집니다."),
    email:       L("Имэйл нэмснээр ажил олгогчийн мэдэгдлийг хүлээн авна.","Add email to receive employer notifications.","이메일 추가로 고용주 알림을 받을 수 있습니다."),
    about:       L("Дэлгэрэнгүй танилцуулга хайлтын дэс дэвшлийг сайжруулна.","A detailed bio improves search ranking.","자세한 소개는 검색 순위를 올립니다."),
  };
  const aiTips = TASKS.filter(t => !t.done).slice(0, 3).map(t => AI_TIPS[t.id]).filter(Boolean);

  const R = 48, CIRC = 2 * Math.PI * R;
  const dash = (pct / 100) * CIRC;

  return (
    <div style={{ background:"linear-gradient(135deg,rgba(180,136,255,0.08),rgba(79,163,255,0.06))", border:"1px solid rgba(180,136,255,0.25)", borderRadius:20, padding:"20px 18px 16px", margin:"16px 0" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18 }}>
        <span style={{ fontSize:18 }}>🛂</span>
        <span style={{ fontSize:13, fontWeight:800, color:"var(--ink)", letterSpacing:0.3 }}>Talent Passport</span>
        <span style={{ marginLeft:"auto", fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:6, background:"linear-gradient(135deg,#B488FF,#4FA3FF)", color:"#fff" }}>PASSPORT</span>
      </div>

      {/* Large circle + level track */}
      <div style={{ display:"flex", alignItems:"center", gap:20, marginBottom:18 }}>
        <div style={{ flexShrink:0 }}>
          <svg width={116} height={116} viewBox="0 0 116 116">
            <circle cx={58} cy={58} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={9} />
            <circle cx={58} cy={58} r={R} fill="none" stroke={ps.color} strokeWidth={9} strokeLinecap="round"
              strokeDasharray={`${dash} ${CIRC}`} transform="rotate(-90 58 58)"
              style={{ transition:"stroke-dasharray 0.9s cubic-bezier(0.4,0,0.2,1)" }} />
            <text x={58} y={53} textAnchor="middle" fontSize={22} fontWeight={900} fill={ps.color} fontFamily="'Barlow Condensed',sans-serif">{pct}%</text>
            <text x={58} y={69} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--dim)" fontFamily="inherit">{L("Бүрэн","Complete","완성")}</text>
          </svg>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:11, color:"var(--dim)", fontWeight:700, textTransform:"uppercase", letterSpacing:0.8, marginBottom:10 }}>{L("Паспортын түвшин","Passport Level","패스포트 레벨")}</div>
          {LEVELS.map(lv => {
            const isCur  = lv.id === curLevel.id;
            const isPast = !isCur && pct >= lv.min;
            return (
              <div key={lv.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", transition:"all .3s",
                  background: isCur ? ps.color : isPast ? "#3DDC97" : "rgba(255,255,255,0.15)",
                  boxShadow: isCur ? `0 0 8px ${ps.color}` : "none" }} />
                <span style={{ fontSize:12, fontWeight:isCur?800:500,
                  color: isCur ? ps.color : isPast ? "#3DDC97" : "var(--dim)" }}>{lv.label}</span>
                {isCur && <span style={{ marginLeft:"auto", fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:5, background:ps.color+"22", color:ps.color }}>{L("Одоогийн","Current","현재")}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom:18 }}>
        <div style={{ height:7, borderRadius:99, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
          <div style={{ height:"100%", borderRadius:99, background:`linear-gradient(90deg,${ps.color},${ps.color}cc)`, width:pct+"%", transition:"width 0.9s cubic-bezier(0.4,0,0.2,1)" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
          <span style={{ fontSize:10, color:"var(--dim)" }}>0</span>
          <span style={{ fontSize:10, color:"var(--dim)" }}>100</span>
        </div>
      </div>

      {/* Skill test badge inside Talent Passport */}
      {f.skillTestCompleted && (
        <div style={{ marginBottom:16 }}>
          <SkillTestBadge score={f.skillTestScore} />
        </div>
      )}

      {/* Task checklist */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:800, color:"var(--ink)", letterSpacing:0.3, marginBottom:10 }}>{L("Паспорт даалгаврууд","Passport Tasks","패스포트 과제")}</div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {TASKS.map(task => (
            <div key={task.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:11,
              background: task.done ? "rgba(61,220,151,0.07)" : "rgba(255,255,255,0.04)",
              border:`1px solid ${task.done?"rgba(61,220,151,0.2)":"rgba(255,255,255,0.07)"}` }}>
              <span style={{ fontSize:13, color:task.done?"#3DDC97":"var(--dim)", flexShrink:0 }}>{task.done?"✅":"☐"}</span>
              <span style={{ flex:1, fontSize:12, color:task.done?"#3DDC97":"var(--ink)", fontWeight:task.done?600:400,
                textDecoration:task.done?"line-through":"none", opacity:task.done?0.7:1 }}>{task.label}</span>
              <span style={{ fontSize:11, fontWeight:800, color:task.done?"#3DDC97":ps.color, minWidth:32, textAlign:"right" }}>+{task.pts}</span>
              {!task.done && (
                <button onClick={() => onAction?.(task.action)} style={{ padding:"4px 10px", borderRadius:8, border:`1px solid ${ps.color}55`,
                  background:ps.color+"15", color:ps.color, fontSize:10.5, fontWeight:700, cursor:"pointer", flexShrink:0 }}>
                  {task.btn}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Next goal */}
      {nextLevel && (
        <div style={{ padding:"12px 14px", borderRadius:13, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)", marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:800, color:"var(--dim)", textTransform:"uppercase", letterSpacing:0.7, marginBottom:6 }}>{L("Дараагийн зорилго","Next Goal","다음 목표")}</div>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:"var(--dim)" }}>{L("Одоогийн","Current","현재")}: <b style={{ color:ps.color }}>{curLevel.label}</b></span>
            <span style={{ color:"var(--dim)" }}>→</span>
            <span style={{ fontSize:12, color:"var(--dim)" }}>{L("Дараагийн","Next","다음")}: <b style={{ color:"#B488FF" }}>{nextLevel.label}</b></span>
          </div>
          <div style={{ fontSize:12, color:"var(--dim)", marginTop:5 }}>
            {L(`${ptsToNext} оноо дутуй байна.`,`${ptsToNext} more points needed.`,`${ptsToNext}점이 더 필요합니다.`)}
          </div>
        </div>
      )}

      {/* AI suggestions */}
      {aiTips.length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:800, color:"var(--dim)", textTransform:"uppercase", letterSpacing:0.7, marginBottom:8, display:"flex", alignItems:"center", gap:5 }}>
            <span>✨</span> {L("AI зөвлөмж","AI Suggestions","AI 제안")}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {aiTips.map((tip, i) => (
              <div key={i} style={{ fontSize:12, color:"var(--dim)", padding:"8px 12px", borderRadius:10,
                background:"rgba(180,136,255,0.07)", border:"1px solid rgba(180,136,255,0.15)", lineHeight:1.5 }}>
                💡 {tip}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reward popup */}
      {reward && (
        <div style={{ position:"fixed", inset:0, zIndex:120, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
          <div style={{ background:"linear-gradient(135deg,#1e1b2e,#1a1917)", border:"2px solid rgba(61,220,151,0.5)",
            borderRadius:24, padding:"28px 40px", textAlign:"center", boxShadow:"0 24px 80px rgba(0,0,0,0.8)",
            animation:"passportReward 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div style={{ fontSize:36, marginBottom:6 }}>🎉</div>
            <div style={{ fontSize:15, fontWeight:800, color:"#fff", marginBottom:4 }}>{L("Паспорт шинэчлэгдлээ!","Passport Updated!","패스포트 업데이트!")}</div>
            <div style={{ fontSize:24, fontWeight:900, color:"#3DDC97", fontFamily:"'Barlow Condensed',sans-serif", marginBottom:10 }}>+{reward.pts} {L("Оноо","Points","점")}</div>
            <div style={{ display:"flex", alignItems:"center", gap:12, justifyContent:"center" }}>
              <span style={{ fontSize:20, fontWeight:900, color:"var(--dim)", fontFamily:"'Barlow Condensed',sans-serif" }}>{reward.from}%</span>
              <span style={{ fontSize:18, color:"var(--dim)" }}>→</span>
              <span style={{ fontSize:26, fontWeight:900, color:"#3DDC97", fontFamily:"'Barlow Condensed',sans-serif" }}>{reward.to}%</span>
            </div>
            <div style={{ fontSize:11, color:"var(--dim)", marginTop:8 }}>🛂 Passport</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Нэг дэлгэцийн нэр дэвшигчийн карт ──────────── */

function CandidateCard({ c, active, saved, onToggleSave, onContact, onDownload, onOpen, empVerified, empCanContact }) {

  const { t, lang } = useLang();

  const [playing, setPlaying] = useState(true);

  const [muted, setMuted] = useState(true);

  const [progress, setProgress] = useState(0);

  const [showPassport, setShowPassport] = useState(false);

  const [showMore, setShowMore] = useState(false);

  const accent = TRADE[c.category]?.hex || "#FF6B35";

  const ps = computePassportScore(c);

  const videoRef = useRef(null);

  // Идэвхтэй карт дээр жишээ "тоглуулах" прогрессыг хөдөлгөнө (42 секундын танилцуулга)

  useEffect(() => {

    if (!active || !playing) return;

    setProgress(0);

    const t = setInterval(() => {

      setProgress((p) => (p >= 100 ? 0 : p + 100 / 42 / 4)); // ~42с давталт

    }, 250);

    return () => clearInterval(t);

  }, [active, playing]);

  // Control real video element when videoFile is present
  useEffect(() => {
    if (!videoRef.current) return;
    if (active && playing) videoRef.current.play().catch(() => {});
    else videoRef.current.pause();
  }, [active, playing]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = muted;
  }, [muted]);

  const togglePlay = () => setPlaying((p) => !p);



  return (

    <section className="card" aria-label={`${c.name}, ${c.category}`}>

      {/* AI Match Score badge */}

      {/* Top-left row: AI MATCH + Verified icons on same line */}
      <div style={{ position: "absolute", top: 14, left: 14, zIndex: 20, display: "flex", alignItems: "center", gap: 6 }}>
        {AI_MATCH[c.id] && (() => {
          const m = AI_MATCH[c.id];
          const col = m.score >= 90 ? "#3DDC97" : m.score >= 80 ? "#4FA3FF" : m.score >= 70 ? "#FFD23F" : "#FF6B35";
          return (
            <div style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)", border: `1.5px solid ${col}55`, borderRadius: 12, padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: col, lineHeight: 1, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: -0.5 }}>{m.score}%</span>
              <span style={{ fontSize: 7.5, fontWeight: 800, color: col, letterSpacing: 0.8, opacity: 0.85 }}>AI</span>
            </div>
          );
        })()}
        {empVerified && (
          <div style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)", border: "1.5px solid rgba(61,220,151,0.45)", borderRadius: 12, padding: "4px 7px", display: "flex", alignItems: "center" }}>
            <ShieldCheck size={14} color="#3DDC97" />
          </div>
        )}
      </div>

      {c.isLive && (

        <div style={{

          position: "absolute", top: 14, left: 74, zIndex: 20,

          display: "flex", alignItems: "center", gap: 5,

          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)",

          border: "1.5px solid rgba(61,220,151,0.5)",

          borderRadius: 20, padding: "3px 10px 3px 7px",

        }}>

          <span style={{

            width: 8, height: 8, borderRadius: "50%", background: "#3DDC97",

            boxShadow: "0 0 6px #3DDC97", animation: "livePulse 1.4s infinite",

          }} />

          <span style={{ fontSize: 11, fontWeight: 800, color: "#3DDC97", letterSpacing: 0.5 }}>

            {lang === "en" ? "JUST JOINED" : "ШИНЭ БҮРТГЭЛ"}

          </span>

        </div>

      )}






      <div className="card__video" onClick={togglePlay} style={{ position: "relative" }}>

        {c.videoFile ? (
          <video
            ref={videoRef}
            src={c.videoFile}
            poster={c.poster}
            loop
            playsInline
            muted={muted}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <VideoIntro c={c} playing={active && playing} />
        )}

        {/* Sample Video CV label */}
        {c.videoFile && (
          <div style={{
            position: "absolute", top: 12, right: 12, zIndex: 15,
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(0,0,0,0.62)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 20, padding: "3px 10px 3px 8px",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF3B30", boxShadow: "0 0 5px #FF3B30", flexShrink: 0 }}>
              <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite" />
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", letterSpacing: 0.4 }}>
              {lang === "en" ? "Sample Video CV" : lang === "ko" ? "샘플 영상 CV" : "Жишээ Видео CV"}
            </span>
          </div>
        )}

      </div>



      <div className="card__progress" aria-hidden>

        <span style={{ width: `${progress}%`, background: accent }} />

      </div>



      {!playing && active && (

        <button className="card__playhint" onClick={togglePlay} aria-label="Видео тоглуулах">

          <Play size={34} fill="currentColor" />

        </button>

      )}



      <button

        className="card__mute"

        onClick={() => setMuted((m) => !m)}

        aria-label={muted ? "Дуу нээх" : "Дуу хаах"}

      >

        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}

      </button>



      <div className="card__scrim" />


      {/* Passport Preview Modal */}
      {showPassport && (
        <div
          onClick={e => { e.stopPropagation(); setShowPassport(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(0,0,0,0.72)", backdropFilter: "blur(10px)",
            display: "flex", alignItems: "flex-end",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxHeight: "88vh", overflowY: "auto",
              background: "var(--bg)", borderRadius: "22px 22px 0 0",
              padding: "0 18px 48px",
            }}
          >
            {/* Handle */}
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 2, margin: "14px auto 20px" }} />

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: ps.color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  🛂 {lang === "en" ? "Passport Score" : lang === "ko" ? "패스포트 점수" : "Паспорт оноо"}
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "var(--ink)" }}>{c.name}</div>
                <div style={{ fontSize: 13, color: accent, fontWeight: 600, marginTop: 2 }}>{t(c.category)}</div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>📍 {c.location}</div>
              </div>
              {/* Score ring */}
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                {(() => {
                  const R = 28, CIRC = 2 * Math.PI * R;
                  const dash = (ps.total / 100) * CIRC;
                  return (
                    <svg width={70} height={70} viewBox="0 0 70 70">
                      <circle cx={35} cy={35} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={7} />
                      <circle cx={35} cy={35} r={R} fill="none" stroke={ps.color} strokeWidth={7}
                        strokeLinecap="round" strokeDasharray={`${dash} ${CIRC}`}
                        transform="rotate(-90 35 35)" />
                      <text x={35} y={40} textAnchor="middle" fontSize={16} fontWeight={900}
                        fill={ps.color} fontFamily="'Barlow Condensed',sans-serif">{ps.total}</text>
                    </svg>
                  );
                })()}
                <div style={{ fontSize: 13, fontWeight: 800, color: ps.color, marginTop: -4, fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 0.5 }}>
                  {ps.grade}
                </div>
              </div>
            </div>

            {/* Breakdown bars */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>
                {lang === "en" ? "Score Breakdown" : lang === "ko" ? "점수 내역" : "Оноо задаргаа"}
              </div>
              {ps.breakdown.map(d => {
                const pct = Math.round((d.val / d.max) * 100);
                const bc = pct === 100 ? "#3DDC97" : pct >= 60 ? "#4FA3FF" : pct > 0 ? "#FFD23F" : "rgba(255,255,255,0.12)";
                return (
                  <div key={d.label} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: "var(--dim)" }}>{lang === "en" ? d.labelEn : d.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: bc }}>{d.val}/{d.max}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: "rgba(255,255,255,0.07)" }}>
                      <div style={{ height: "100%", borderRadius: 99, background: bc, width: pct + "%" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Summary */}
            {c.ai?.resume && (
              <div style={{ background: "rgba(180,136,255,0.07)", border: "1px solid rgba(180,136,255,0.2)", borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#B488FF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                  ✦ {lang === "en" ? "AI Summary" : lang === "ko" ? "AI 요약" : "AI дүгнэлт"}
                </div>
                <p style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.65, margin: 0 }}>{c.ai.resume}</p>
              </div>
            )}

            {/* Video Introduction */}
            {c.videoFile && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#FF3B30", display: "inline-block" }} />
                  {lang === "en" ? "Video Introduction · Sample Video CV" : lang === "ko" ? "영상 소개 · 샘플 영상 CV" : "Видео танилцуулга · Жишээ Видео CV"}
                </div>
                <div style={{ borderRadius: 14, overflow: "hidden", background: "#000", position: "relative" }}>
                  <video
                    src={c.videoFile}
                    poster={c.poster}
                    controls
                    playsInline
                    muted
                    style={{ width: "100%", display: "block", maxHeight: 260, objectFit: "cover" }}
                  />
                </div>
                <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 6, textAlign: "center" }}>
                  {lang === "en" ? "🛂 Verified Video CV — tap to play" : lang === "ko" ? "🛂 인증된 영상 CV — 탭하여 재생" : "🛂 Баталгаажсан Видео CV — дарж тоглуул"}
                </div>
              </div>
            )}

            {/* Skills */}
            {c.skills?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                  {lang === "en" ? "Skills" : lang === "ko" ? "기술" : "Ур чадвар"} ({c.skills.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {c.skills.map((s, i) => (
                    <span key={i} style={{ padding: "5px 11px", borderRadius: 99, fontSize: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--ink)" }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Certs */}
            {c.certs?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                  {lang === "en" ? "Certificates" : lang === "ko" ? "자격증" : "Гэрчилгээ"} ({c.certs.length})
                </div>
                {c.certs.map((cert, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "rgba(61,220,151,0.06)", border: "1px solid rgba(61,220,151,0.15)", marginBottom: 6, fontSize: 13, color: "var(--ink)" }}>
                    <span style={{ color: "#3DDC97", fontSize: 14 }}>✓</span> {cert}
                  </div>
                ))}
              </div>
            )}

            {/* Experience */}
            {c.experience?.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                  {lang === "en" ? "Experience" : lang === "ko" ? "경력" : "Туршлага"}
                </div>
                {c.experience.map((e, i) => (
                  <div key={i} style={{ padding: "9px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{e.role}</div>
                    <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{e.org} · {e.period}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Salary */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: 12, color: "var(--dim)" }}>{lang === "en" ? "Expected Salary" : lang === "ko" ? "희망 급여" : "Хүсэж буй цалин"}</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: "var(--ink)", fontFamily: "'Barlow Condensed',sans-serif" }}>{tgr(c.salary)}</span>
            </div>

            {/* Close */}
            <button
              onClick={() => setShowPassport(false)}
              style={{ width: "100%", marginTop: 16, padding: "14px 0", borderRadius: 14, border: "none", background: "rgba(255,255,255,0.07)", color: "var(--dim)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
            >
              {lang === "en" ? "Close" : lang === "ko" ? "닫기" : "Хаах"}
            </button>
          </div>
        </div>
      )}

      {/* баруун талын ⋮ More товч */}

      <button
        className="rail__more"
        onClick={e => { e.stopPropagation(); setShowMore(true); }}
        aria-label="More actions"
        style={{
          position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", zIndex: 20,
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
          border: "1.5px solid rgba(255,255,255,0.18)",
          display: "grid", placeItems: "center", cursor: "pointer",
          fontSize: 20, color: "#fff", lineHeight: 1,
        }}
      >⋮</button>

      {/* More bottom sheet */}
      {showMore && (
        <div
          onClick={e => { e.stopPropagation(); setShowMore(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 310, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)", display: "flex", alignItems: "flex-end" }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", background: "var(--bg-2)", borderRadius: "24px 24px 0 0", paddingBottom: "env(safe-area-inset-bottom, 28px)", overflow: "hidden", animation: "rise 0.28s cubic-bezier(0.32,0.72,0,1)" }}>

            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.18)" }} />
            </div>

            {/* Header: avatar + name + profession + passport badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {/* Avatar */}
              <div style={{ width: 48, height: 48, borderRadius: 14, background: accent + "22", border: `2px solid ${accent}44`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: accent, fontFamily: "'Barlow Condensed',sans-serif" }}>
                  {c.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
                </span>
              </div>
              {/* Name + profession */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                <div style={{ fontSize: 12, color: accent, fontWeight: 600, marginTop: 1 }}>{t(c.category)}</div>
              </div>
              {/* Passport score badge */}
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", background: ps.color + "18", border: `1px solid ${ps.color}44`, borderRadius: 12, padding: "5px 10px" }}>
                <span style={{ fontSize: 7, fontWeight: 800, color: ps.color, letterSpacing: 0.8, textTransform: "uppercase" }}>🛂 Passport</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: ps.color, fontFamily: "'Barlow Condensed',sans-serif", lineHeight: 1.2 }}>{ps.total}</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: ps.color, opacity: 0.8 }}>{ps.grade}</span>
              </div>
              {/* Close */}
              <button onClick={() => setShowMore(false)} style={{ flexShrink: 0, width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.08)", color: "var(--dim)", display: "grid", placeItems: "center", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>

            {/* Primary actions */}
            <div style={{ padding: "14px 16px 4px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 10, paddingLeft: 4 }}>
                {lang === "en" ? "Actions" : lang === "ko" ? "액션" : "Үйлдлүүд"}
              </div>

              {/* Open Passport — highlighted */}
              <button onClick={() => { setShowMore(false); setShowPassport(true); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 16, border: `1.5px solid ${ps.color}55`, background: `linear-gradient(135deg,${ps.color}18,${ps.color}08)`, cursor: "pointer", marginBottom: 8, textAlign: "left" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: ps.color + "22", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 18 }}>🛂</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: ps.color }}>{lang === "en" ? "Open Passport" : lang === "ko" ? "패스포트 보기" : "Паспорт харах"}</div>
                  <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{lang === "en" ? "View verified skills, certificates and AI score" : lang === "ko" ? "인증 스킬, 자격증 및 AI 점수 보기" : "Баталгаажсан ур чадвар, гэрчилгээ, AI оноо"}</div>
                </div>
                <ChevronRight size={16} color={ps.color} style={{ flexShrink: 0 }} />
              </button>

              {/* Contact */}
              <button onClick={() => { onContact(c); setShowMore(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderRadius: 16, border: empCanContact === false ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(255,255,255,0.08)", background: empCanContact === false ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)", cursor: "pointer", marginBottom: 8, textAlign: "left", opacity: empCanContact === false ? 0.65 : 1 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: empCanContact === false ? "rgba(139,139,139,0.1)" : "rgba(79,163,255,0.12)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  {empCanContact === false ? <span style={{ fontSize: 18 }}>🔒</span> : <Phone size={18} color="#4FA3FF" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: empCanContact === false ? "var(--dim)" : "var(--ink)" }}>{empCanContact === false ? (lang === "en" ? "Contact Locked" : lang === "ko" ? "연락 잠김" : "Холбоо барих эрх хаалттай") : t("contactBtn")}</div>
                  <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{empCanContact === false ? (lang === "en" ? "Verify your company to unlock" : lang === "ko" ? "회사 인증 후 이용 가능" : "Компани баталгаажуулсны дараа нэвтэрнэ") : (lang === "en" ? "Send a message or call" : lang === "ko" ? "메시지 또는 전화" : "Мессеж илгээх эсвэл залгах")}</div>
                </div>
                <ChevronRight size={16} color="var(--dim)" style={{ flexShrink: 0 }} />
              </button>

              {/* Save */}
              <button onClick={() => { onToggleSave(c.id); setShowMore(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", borderRadius: 16, border: `1px solid ${saved ? accent + "55" : "rgba(255,255,255,0.08)"}`, background: saved ? accent + "10" : "rgba(255,255,255,0.04)", cursor: "pointer", marginBottom: 4, textAlign: "left" }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: saved ? accent + "22" : "rgba(255,255,255,0.08)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  {saved ? <BookmarkCheck size={18} color={accent} /> : <Bookmark size={18} color="var(--dim)" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: saved ? accent : "var(--ink)" }}>{saved ? t("savedBtn") : t("saveBtn")}</div>
                  <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{lang === "en" ? "Add to your shortlist" : lang === "ko" ? "단축목록에 추가" : "Богино жагсаалтад нэмэх"}</div>
                </div>
                <ChevronRight size={16} color="var(--dim)" style={{ flexShrink: 0 }} />
              </button>
            </div>

            {/* Secondary actions */}
            <div style={{ padding: "4px 16px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.9, margin: "10px 0 10px 4px" }}>
                {lang === "en" ? "More" : lang === "ko" ? "더보기" : "Бусад"}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { icon: <FileDown size={16} />, label: lang === "en" ? "Download CV" : lang === "ko" ? "CV 다운로드" : "CV татах", action: () => { onDownload(c); setShowMore(false); }, color: "#4FA3FF" },
                  { icon: <FileText size={16} />, label: lang === "en" ? "Full Profile" : lang === "ko" ? "전체 프로필" : "Профайл", action: () => { onOpen(c); setShowMore(false); }, color: "#3DDC97" },
                  ...(SUPABASE_CONFIGURED && typeof c.id === "string" ? [{ icon: <span style={{ fontSize: 15 }}>▶</span>, label: lang === "en" ? "Video CV" : "Видео CV", action: async () => { setShowMore(false); const url = await getCandidateDocumentUrl({ candidateId: c.id, kind: "video" }); if (url) window.open(url, "_blank"); }, color: "#B488FF" }] : []),
                  { icon: <span style={{ fontSize: 14 }}>⚑</span>, label: lang === "en" ? "Report" : lang === "ko" ? "신고" : "Мэдэгдэх", action: () => setShowMore(false), color: "#FF6B35" },
                ].map((item, i) => (
                  <button key={i} onClick={item.action} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 8px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", cursor: "pointer", color: item.color }}>
                    {item.icon}
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--dim)", textAlign: "center", lineHeight: 1.2 }}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}



      {/* нэр дэвшигчийн мэдээлэл — дарвал дэлгэрэнгүй нээгдэнэ */}

      <div className="meta" onClick={() => onOpen(c)} role="button" tabIndex={0}

        onKeyDown={(e) => (e.key === "Enter" ? onOpen(c) : null)}>

        {/* Row 1: Name · Age + Verified */}
        <h2 className="meta__name">
          <span className="meta__name__text">
            {c.name} <span className="meta__age">· {c.age}</span>
          </span>
          {c.verified.id && <BadgeCheck size={16} className="meta__check" />}
        </h2>

        {/* Row 2: Profession badge */}
        <div style={{ marginBottom: 10 }}>
          <span className="meta__trade" style={{ background: accent, display: "inline-block" }}>
            {t(c.category)}
          </span>
        </div>

        {/* Row 3: Location · Experience · Salary */}
        <div className="meta__stats">
          <span><MapPin size={13} /> {c.location}</span>
          <span><Briefcase size={13} /> {c.years} {lang === "en" ? "yrs" : "жил"}</span>
          <span><Wallet size={13} /> {tgr(c.salary)}</span>
        </div>

        {/* Row 4: Availability */}
        <div style={{ marginTop: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, color: c.available ? "#3DDC97" : "#FFD23F" }}>
            <CircleDot size={13} /> {t(c.availableFrom) || c.availableFrom}
          </span>
        </div>

        <span className="meta__more">{t("viewProfile")}</span>

      </div>

    </section>

  );

}



/* ── Дэлгэрэнгүй профайл хуудас ─────────────────── */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Demo mode: the app runs entirely on-device with sample candidates/jobs and
// no server. It is on whenever Supabase is not configured. This flag gates
// the demo indicator and must be false in a real deployment (env present).
// The hardcoded CANDIDATES / JOBS / AI_MATCH below are sample fixtures shown
// only while DEMO_MODE is true.
const DEMO_MODE = !(SUPABASE_URL && SUPABASE_ANON_KEY);

/* ── Report sheet ─────────────────────────────────────────────────
 * Both app stores require a way to flag user-generated content.
 * Reports are queued locally and forwarded when a backend exists;
 * the user is told plainly what happens next.
 */
function ReportSheet({ subjectName, lang, onClose }) {
  const L = (mn, en, ko) => lang === "en" ? en : lang === "ko" ? ko : mn;
  const [reason, setReason] = useState(null);
  const [detail, setDetail] = useState("");
  const [sent, setSent]     = useState(false);

  const reasons = [
    { id: "fake",       label: L("Хуурамч профайл",        "Fake profile",            "가짜 프로필") },
    { id: "impersonate",label: L("Бусдын нэрийг далимдуулсан", "Impersonation",       "사칭") },
    { id: "scam",       label: L("Залилан, мөнгө нэхсэн",  "Scam or money request",   "사기·금전 요구") },
    { id: "offensive",  label: L("Доромжилсон агуулга",    "Offensive content",       "불쾌한 콘텐츠") },
    { id: "notmine",    label: L("Миний зөвшөөрөлгүй мэдээлэл", "My data used without consent", "무단 개인정보") },
    { id: "other",      label: L("Бусад",                  "Other",                   "기타") },
  ];

  const submit = () => {
    try {
      const queue = JSON.parse(localStorage.getItem("swipehire_reports") || "[]");
      queue.push({ subject: subjectName, reason, detail: detail.slice(0, 1000), at: new Date().toISOString() });
      localStorage.setItem("swipehire_reports", JSON.stringify(queue));
    } catch {}
    setSent(true);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 300, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
         onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 440, background: "var(--bg-2)", borderRadius: "22px 22px 0 0",
        padding: "22px 20px max(30px, calc(20px + env(safe-area-inset-bottom,0px)))", border: "1px solid rgba(255,255,255,0.08)", maxHeight: "88dvh", overflowY: "auto" }}>

        {sent ? (
          <div style={{ textAlign: "center", padding: "14px 0 4px" }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>✓</div>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#3DDC97", marginBottom: 8 }}>
              {L("Мэдэгдэл хүлээн авлаа", "Report received", "신고 접수됨")}
            </div>
            <p style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.6, margin: "0 0 18px" }}>
              {L("Таны мэдэгдэл бүртгэгдлээ. Туршилтын хугацаанд мэдэгдлийг энэ төхөөрөмжид хадгалж, шалгах баг ажиллаж эхэлмэгц хянана. Яаралтай тохиолдолд шууд холбогдоно уу.",
                 "Your report has been logged. During the beta it is stored on this device and will be reviewed once the moderation team is live. For urgent matters please contact us directly.",
                 "신고가 기록되었습니다. 베타 기간에는 기기에 저장되며 검토팀 가동 후 확인됩니다.")}
            </p>
            <button onClick={onClose} style={{ width: "100%", padding: 13, borderRadius: 13, border: "none", background: "#FF6B35", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              {L("Хаах", "Close", "닫기")}
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: "var(--ink)" }}>
                  {L("Профайлыг мэдэгдэх", "Report profile", "프로필 신고")}
                </div>
                <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{subjectName}</div>
              </div>
              <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 10, width: 32, height: 32, cursor: "pointer", color: "var(--dim)", fontSize: 15 }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
              {reasons.map(r => (
                <button key={r.id} onClick={() => setReason(r.id)}
                  style={{ textAlign: "left", padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                    background: reason === r.id ? "rgba(255,107,53,0.12)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${reason === r.id ? "rgba(255,107,53,0.45)" : "rgba(255,255,255,0.08)"}`,
                    color: reason === r.id ? "#FF8A3D" : "var(--ink)", fontWeight: reason === r.id ? 700 : 500, fontSize: 13.5 }}>
                  {r.label}
                </button>
              ))}
            </div>

            <textarea
              value={detail} onChange={e => setDetail(e.target.value)} maxLength={1000}
              placeholder={L("Нэмэлт тайлбар (заавал бус)", "Additional detail (optional)", "추가 설명 (선택)")}
              style={{ width: "100%", minHeight: 76, padding: "11px 13px", borderRadius: 12, resize: "vertical",
                border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)",
                color: "var(--ink)", fontSize: 13.5, outline: "none", boxSizing: "border-box", marginBottom: 14,
                fontFamily: "inherit" }}
            />

            <button onClick={submit} disabled={!reason}
              style={{ width: "100%", padding: 14, borderRadius: 13, border: "none",
                background: reason ? "#FF5050" : "rgba(255,80,80,0.28)",
                color: reason ? "#fff" : "rgba(255,255,255,0.45)",
                fontWeight: 800, fontSize: 15, cursor: reason ? "pointer" : "not-allowed" }}>
              {L("Мэдэгдэл илгээх", "Submit report", "신고하기")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ProfileDetail({ c, saved, stage, note, onBack, onToggleSave, onContact, onDownload, onSetStage, onSetNote, empVerifData }) {

  const { t, lang } = useLang();

  const accent = TRADE[c.category]?.hex || "#FF6B35";

  const [draftNote, setDraftNote] = useState(note || "");

  const [showTranscript, setShowTranscript] = useState(false);

  const [showReport, setShowReport] = useState(false);

  const [aiTest, setAiTest] = useState(null);   // null | "loading" | {result} | {error}
  async function runAiSummary() {
    setAiTest("loading");
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/generate-candidate-summary`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          },
          // Data minimisation: only job-relevant attributes leave the device.
          // Deliberately excluded — name, age, gender, phone, email, exact
          // address, photo and any identity document. The summary is about
          // suitability for a role, and none of those inform that.
          body: JSON.stringify({
            candidate: {
              ref: String(c.id),              // opaque reference, not a name
              category: c.category,
              yearsExperience: c.years,
              skills: (c.skills || []).slice(0, 20),
              certifications: (c.certs || []).slice(0, 10),
              educationLevel: (c.education || [])[0]?.degree || null,
              summary: (c.about || "").slice(0, 600),
              skillTestScore: c.skillTestScore ?? null,
              skillTestLevel: c.skillTestLevel ?? "",
            },
            employerNeed: {
              role: c.category,
              // company name and location omitted — not needed to summarise
              // a candidate's fit and they identify the employer to the model
            },
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) setAiTest({ error: data.error || "Алдаа гарлаа" });
      else setAiTest({ result: data });
    } catch (err) {
      setAiTest({ error: String(err) });
    }
  }



  useEffect(() => setDraftNote(note || ""), [note, c.id]);



  return (

    <div className="detail">

      <header className="detail__bar">

        <button onClick={onBack} aria-label="Back"><ChevronLeft size={22} /></button>

        <span className="detail__bartitle">{t("profileDetail")}</span>

        <button

          onClick={() => onToggleSave(c.id)}

          aria-label="Хадгалах"

          style={saved ? { color: accent } : undefined}

        >

          {saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}

        </button>

      </header>



      <div className="detail__scroll">

        {/* Танилцуулга видео */}

        <div className="detail__videowrap">

          <VideoIntro c={c} playing={true} />

          <span className="detail__vidlabel">

            <Play size={13} fill="currentColor" /> {t("videoIntro")} · 0:42

          </span>

        </div>



        <div className="detail__head">

          <Avatar c={c} size={64} />

          <div>

            <h1 className="detail__name">{c.name} <span>· {c.age}</span></h1>

            <span className="detail__trade" style={{ color: accent }}>{t(c.category)}</span>

            <div className="detail__avail" style={{ color: c.available ? "#3DDC97" : "#FF6B6B" }}>

              <CircleDot size={13} />

              {c.available ? `${t("available")} · ${c.availableFrom}` : `${t("available")}: ${c.availableFrom}`}

            </div>

          </div>

        </div>



        {/* AI Resume Summary — HR 5 секундэд ойлгоно */}

        <div className="resume">

          <div className="resume__head"><Sparkles size={15} /> {t("aiSummary")}</div>

          <p className="resume__text">{c.ai.resume}</p>

        </div>



        <TrustMeter v={c.verified} />

        <PassportScoreWidget c={c} lang={lang} />

        {c.skillTestCompleted && <SkillTestBadge score={c.skillTestScore} />}

        <VerifyBadges v={c.verified} />



        {/* Үндсэн үзүүлэлт */}

        <div className="detail__quick">

          <div><MapPin size={15} /><b>{c.location}</b><small>{lang === "en" ? "Location" : "Байршил"}</small></div>

          <div><Briefcase size={15} /><b>{c.years} {lang === "en" ? "yrs" : "жил"}</b><small>{t("expTitle")}</small></div>

          <div><Wallet size={15} /><b>{tgr(c.salary)}</b><small>{lang === "en" ? "Desired salary" : "Хүсэж буй цалин"}</small></div>

          <div><CalendarClock size={15} /><b>{c.availableFrom}</b><small>{t("available")}</small></div>

        </div>



        {/* AI товч дүгнэлт */}

        <div className="ai">

          <div className="ai__head"><Sparkles size={16} /> AI дэлгэрэнгүй задаргаа</div>

          <div className="ai__grid">

            <div className="ai__cell">

              <small>Гол ур чадвар</small>

              <b>{c.ai.coreSkill}</b>

            </div>

            <div className="ai__cell">

              <small>Туршлагын түвшин</small>

              <b>{c.ai.level}</b>

            </div>

            <div className="ai__cell ai__cell--wide">

              <small>Тохирох ажлын байр</small>

              <b>{c.ai.bestFit}</b>

            </div>

          </div>

          <div className="ai__strengths">

            <small>Давуу тал</small>

            <div className="ai__chips">

              {c.ai.strengths.map((s, i) => (

                <span key={i} className="ai__chip" style={{ borderColor: accent }}>

                  <Check size={12} /> {s}

                </span>

              ))}

            </div>

          </div>

        </div>



        {/* ── Gemini AI Summary тест товч ── */}
        <div style={{ margin:"12px 16px", border:"1.5px dashed #FF6B35", borderRadius:14, padding:14, background:"rgba(255,107,53,0.05)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <Sparkles size={16} color="#FF6B35" />
            <span style={{ fontWeight:700, fontSize:13, color:"#FF6B35" }}>Gemini AI Summary — тест</span>
          </div>

          {/* Third-party processing disclosure — the candidate's data leaves the device */}
          <div style={{ background:"rgba(255,210,63,0.07)", border:"1px solid rgba(255,210,63,0.22)", borderRadius:10, padding:"9px 11px", marginBottom:10 }}>
            <p style={{ margin:0, fontSize:10.5, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>
              ⚠️ Энэ үйлдэл зөвхөн <b style={{ color:"rgba(255,255,255,0.82)" }}>ажилд хамаарах мэдээллийг</b> (мэргэжил,
              туршлагын жил, ур чадвар, гэрчилгээ, боловсролын түвшин) гуравдагч талын AI
              үйлчилгээ рүү илгээнэ. <b style={{ color:"rgba(255,255,255,0.82)" }}>Нэр, нас, хүйс, утас, имэйл, хаяг, зураг
              илгээгдэхгүй</b>. Зөвхөн ажилд авах зорилгоор ашиглана уу.
            </p>
          </div>

          <button
            onClick={runAiSummary}
            disabled={aiTest === "loading"}
            style={{ width:"100%", padding:"10px 0", borderRadius:10, border:"none", background: aiTest === "loading" ? "#333" : "#FF6B35", color:"#fff", fontWeight:700, fontSize:14, cursor: aiTest === "loading" ? "not-allowed" : "pointer", marginBottom: aiTest ? 12 : 0 }}
          >
            {aiTest === "loading" ? "Уншиж байна…" : "AI Summary турших"}
          </button>

          {aiTest && aiTest !== "loading" && aiTest.error && (
            <div style={{ background:"rgba(255,80,80,0.12)", border:"1px solid #FF5050", borderRadius:10, padding:12, color:"#FF5050", fontSize:13 }}>
              ⚠ {aiTest.error}
            </div>
          )}

          {aiTest && aiTest !== "loading" && aiTest.result && (() => {
            const r = aiTest.result;
            return (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:52, height:52, borderRadius:"50%", background:"var(--bg-2)", border:`3px solid ${r.matchScore >= 70 ? "#3DDC97" : r.matchScore >= 50 ? "#FFD23F" : "#FF5050"}`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:16, color: r.matchScore >= 70 ? "#3DDC97" : r.matchScore >= 50 ? "#FFD23F" : "#FF5050", flexShrink:0 }}>
                    {r.matchScore}
                  </div>
                  <p style={{ margin:0, fontSize:13, color:"#ccc", lineHeight:1.5 }}>{r.summary}</p>
                </div>

                {r.strengths?.length > 0 && (
                  <div>
                    <div style={{ fontSize:11, color:"#888", marginBottom:4, fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>Давуу тал</div>
                    {r.strengths.map((s, i) => (
                      <div key={i} style={{ fontSize:13, color:"#3DDC97", paddingLeft:8, lineHeight:1.8 }}>✓ {s}</div>
                    ))}
                  </div>
                )}

                {r.risks?.length > 0 && (
                  <div>
                    <div style={{ fontSize:11, color:"#888", marginBottom:4, fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>Эрсдэл</div>
                    {r.risks.map((s, i) => (
                      <div key={i} style={{ fontSize:13, color:"#FFD23F", paddingLeft:8, lineHeight:1.8 }}>⚠ {s}</div>
                    ))}
                  </div>
                )}

                {r.interviewQuestions?.length > 0 && (
                  <div>
                    <div style={{ fontSize:11, color:"#888", marginBottom:4, fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>Ярилцлагын асуулт</div>
                    {r.interviewQuestions.map((q, i) => (
                      <div key={i} style={{ fontSize:13, color:"#ccc", paddingLeft:8, lineHeight:1.8 }}>{i+1}. {q}</div>
                    ))}
                  </div>
                )}

                {r.employerMessageMN && (
                  <div style={{ background:"rgba(79,163,255,0.1)", border:"1px solid rgba(79,163,255,0.3)", borderRadius:8, padding:10, fontSize:13, color:"#4FA3FF", fontStyle:"italic" }}>
                    💬 {r.employerMessageMN}
                  </div>
                )}

                <button onClick={() => setAiTest(null)} style={{ background:"transparent", border:"1px solid #444", borderRadius:8, color:"#888", fontSize:12, padding:"6px 0", cursor:"pointer" }}>
                  Хаах
                </button>
              </div>
            );
          })()}
        </div>

        {/* Ажилд авах үе шат */}

        <Section icon={<Clock size={16} />} title={lang === "en" ? "Hiring Stage" : "Ажилд авах үе шат"}>

          <div className="stages">

            {STAGES.map((s) => (

              <button

                key={s.key}

                className={`stage ${stage === s.key ? "is-on" : ""}`}

                onClick={() => onSetStage(c.id, s.key)}

                style={stage === s.key ? { background: s.hex, borderColor: s.hex, color: "var(--bg-2)" } : undefined}

              >

                {t(s.key)}

              </button>

            ))}

          </div>

        </Section>



        <Section icon={<FileText size={16} />} title={lang === "en" ? "About" : "Өөрийн тухай"}>

          <p className="detail__about">{c.about}</p>

        </Section>



        <Section icon={<FileText size={16} />} title={lang === "en" ? "Video Transcript" : "Видео танилцуулгын текст"}>

          <button className="transcript__toggle" onClick={() => setShowTranscript((s) => !s)}>

            {showTranscript ? (lang === "en" ? "Hide" : "Текст хаах") : (lang === "en" ? "Show transcript" : "Автомат текст харах")}

          </button>

          {showTranscript && <p className="transcript">"{c.transcript}"</p>}

        </Section>



        <Section icon={<Sparkles size={16} />} title={lang === "en" ? "Skills" : "Ур чадварууд"}>

          <div className="taglist">

            {c.skills.map((s, i) => <span key={i} className="tag">{s}</span>)}

          </div>

        </Section>



        <Section icon={<Award size={16} />} title={t("certTitle")}>

          <ul className="linelist">

            {c.certs.map((s, i) => <li key={i}><Award size={14} /> {s}</li>)}

          </ul>

        </Section>



        <Section icon={<Briefcase size={16} />} title={t("expTitle")}>

          <ul className="timeline">

            {c.experience.map((e, i) => (

              <li key={i}>

                <b>{e.role}</b>

                <span>{e.org}</span>

                <small>{e.period}</small>

              </li>

            ))}

          </ul>

        </Section>



        <Section icon={<GraduationCap size={16} />} title={t("eduTitle")}>

          <ul className="timeline">

            {c.education.map((e, i) => (

              <li key={i}>

                <b>{e.degree}</b>

                <span>{e.school}</span>

                <small>{e.period}</small>

              </li>

            ))}

          </ul>

        </Section>



        <Section icon={<StickyNote size={16} />} title={lang === "en" ? "Interview Notes" : "Ярилцлагын тэмдэглэл"}>

          <textarea

            className="note"

            placeholder="Жишээ: Харилцааны чадвар сайн, туршлага өндөр, дахин холбогдох шаардлагатай..."

            value={draftNote}

            onChange={(e) => setDraftNote(e.target.value)}

            onBlur={() => onSetNote(c.id, draftNote)}

            rows={3}

          />

          <span className="note__hint">{lang === "en" ? "Note is saved automatically" : "Тэмдэглэл автоматаар хадгалагдана"}</span>

        </Section>



        <div style={{ height: 90 }} />

      </div>



      {/* Report — required for user-generated content on both app stores */}
      <div style={{ padding: "0 16px 10px" }}>
        <button
          onClick={() => setShowReport(true)}
          style={{ width: "100%", padding: "9px 0", borderRadius: 10, background: "transparent",
            border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.42)",
            fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Flag size={13} /> {lang === "en" ? "Report this profile" : lang === "ko" ? "프로필 신고" : "Энэ профайлыг мэдэгдэх"}
        </button>
      </div>

      {showReport && (
        <ReportSheet
          subjectName={c.name}
          lang={lang}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* доод үйлдэл */}

      <div className="detail__actions">

        <button className="detail__act detail__act--ghost" onClick={() => onDownload(c)}>

          <FileDown size={18} /> {t("downloadCV")}

        </button>

        <button className="detail__act" style={{ background: accent }} onClick={() => onContact(c)}>

          <Phone size={18} /> {t("contactBtn")}

        </button>

      </div>

    </div>

  );

}



function Section({ icon, title, children }) {

  return (

    <div className="sec">

      <div className="sec__head">{icon} {title}</div>

      {children}

    </div>

  );

}



/* ─────────────────────────────────────────────────

   УТАС БАТАЛГААЖУУЛАХ — OTP flow

   ───────────────────────────────────────────────── */

function PhoneVerifySheet({ phone, onClose, onVerified }) {

  const [stage, setStage] = useState("phone"); // "phone" | "otp" | "done"

  const [num, setNum] = useState(phone || "");

  const [otp, setOtp] = useState(["", "", "", ""]);

  const [loading, setLoading] = useState(false);

  const [err, setErr] = useState("");

  const refs = [useRef(), useRef(), useRef(), useRef()];



  const sendOtp = () => {

    if (!/^\d{8}$/.test(num.replace(/[-\s]/g, ""))) {

      setErr("Зөв 8 оронтой утасны дугаар оруулна уу"); return;

    }

    setErr(""); setLoading(true);

    // TODO: backend SMS API дуудах — POST /api/otp/send { phone: num }

    setTimeout(() => { setLoading(false); setStage("otp"); }, 1200);

  };



  const handleOtpKey = (i, val) => {

    if (!/^\d?$/.test(val)) return;

    const next = [...otp]; next[i] = val; setOtp(next);

    if (val && i < 3) refs[i + 1].current?.focus();

    if (!val && i > 0) refs[i - 1].current?.focus();

  };



  const confirmOtp = () => {

    const code = otp.join("");

    if (code.length < 4) { setErr("4 оронтой кодыг оруулна уу"); return; }

    setErr(""); setLoading(true);

    // TODO: backend — POST /api/otp/verify { phone: num, code }

    // Demo: 1234 буруу бол алдаа, бусад бүх тохиолдолд амжилт

    setTimeout(() => {

      setLoading(false);

      if (code === "0000") { setErr("Код буруу байна. Дахин оролдоно уу"); setOtp(["","","",""]); refs[0].current?.focus(); }

      else { setStage("done"); setTimeout(() => { onVerified(); onClose(); }, 1500); }

    }, 1000);

  };



  return (

    <div className="sheet" onClick={onClose}>

      <div className="sheet__panel" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 32 }}>

        <button className="sheet__close" onClick={onClose}><X size={20} /></button>



        {stage === "phone" && (

          <>

            <div style={{ textAlign: "center", marginBottom: 20 }}>

              <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,107,53,0.15)", border: "1.5px solid rgba(255,107,53,0.4)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>

                <Phone size={24} color="#FF6B35" />

              </div>

              <h3 style={{ margin: "0 0 6px", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 700 }}>Утас баталгаажуулах</h3>

              <p style={{ margin: 0, fontSize: 13, color: "var(--dim)", lineHeight: 1.5 }}>Таны утасны дугаарт OTP код илгээнэ</p>

            </div>

            <div className="field" style={{ marginBottom: 14 }}>

              <label className="field__label"><Phone size={13} /> Утасны дугаар</label>

              <input type="tel" value={num} onChange={(e) => { setNum(e.target.value); setErr(""); }}

                placeholder="9911-2233" style={{ textAlign: "center", fontSize: 18, letterSpacing: 2 }} />

            </div>

            {err && <p style={{ color: "#FF6B35", fontSize: 12, textAlign: "center", margin: "0 0 10px" }}>{err}</p>}

            <button className="wiz__btn" onClick={sendOtp} disabled={loading}

              style={{ width: "100%", opacity: loading ? 0.7 : 1 }}>

              {loading ? "Илгээж байна…" : "Код илгээх →"}

            </button>

          </>

        )}



        {stage === "otp" && (

          <>

            <div style={{ textAlign: "center", marginBottom: 20 }}>

              <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(61,220,151,0.12)", border: "1.5px solid rgba(61,220,151,0.35)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>

                <ShieldCheck size={24} color="#3DDC97" />

              </div>

              <h3 style={{ margin: "0 0 6px", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 700 }}>OTP код оруулах</h3>

              <p style={{ margin: 0, fontSize: 13, color: "var(--dim)", lineHeight: 1.5 }}>{num} дугаарт илгээсэн 4 оронтой код</p>

            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 16 }}>

              {otp.map((d, i) => (

                <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={1} value={d}

                  onChange={(e) => handleOtpKey(i, e.target.value)}

                  onKeyDown={(e) => e.key === "Backspace" && !d && i > 0 && refs[i-1].current?.focus()}

                  style={{ width: 52, height: 60, textAlign: "center", fontSize: 26, fontWeight: 700,

                    background: "var(--bg-2)", border: `2px solid ${d ? "#FF6B35" : "rgba(255,255,255,0.15)"}`,

                    borderRadius: 12, color: "var(--ink)", outline: "none", transition: "border-color .15s" }} />

              ))}

            </div>

            {err && <p style={{ color: "#FF6B35", fontSize: 12, textAlign: "center", margin: "0 0 10px" }}>{err}</p>}

            <button className="wiz__btn" onClick={confirmOtp} disabled={loading}

              style={{ width: "100%", opacity: loading ? 0.7 : 1 }}>

              {loading ? "Шалгаж байна…" : "Баталгаажуулах"}

            </button>

            <button onClick={() => { setStage("phone"); setOtp(["","","",""]); setErr(""); }}

              style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: "var(--dim)", fontSize: 13, cursor: "pointer" }}>

              ← Буцах

            </button>

          </>

        )}



        {stage === "done" && (

          <div style={{ textAlign: "center", padding: "24px 0" }}>

            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(61,220,151,0.15)", border: "2px solid #3DDC97", display: "grid", placeItems: "center", margin: "0 auto 16px", animation: "pop .4s cubic-bezier(.34,1.56,.64,1)" }}>

              <Check size={30} color="#3DDC97" strokeWidth={3} />

            </div>

            <h3 style={{ margin: "0 0 6px", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, color: "#3DDC97" }}>Баталгаажлаа!</h3>

            <p style={{ margin: 0, color: "var(--dim)", fontSize: 13 }}>Таны утас амжилттай баталгаажлаа</p>

          </div>

        )}

      </div>

    </div>

  );

}



/* ─────────────────────────────────────────────────

   ИД БАТАЛГААЖУУЛАХ — зураг upload

   ───────────────────────────────────────────────── */

function IdVerifySheet({ onClose, onVerified }) {

  const [stage, setStage] = useState("upload"); // "upload" | "review" | "done"

  const [loading, setLoading] = useState(false);

  const fileRef = useRef();



  const handleFile = (e) => {

    if (!e.target.files?.length) return;

    setLoading(true);

    // TODO: backend — POST /api/id-verify/upload (FormData)

    setTimeout(() => { setLoading(false); setStage("review"); }, 1500);

  };



  return (

    <div className="sheet" onClick={onClose}>

      <div className="sheet__panel" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 32 }}>

        <button className="sheet__close" onClick={onClose}><X size={20} /></button>



        {stage === "upload" && (

          <>

            <div style={{ textAlign: "center", marginBottom: 20 }}>

              <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(79,163,255,0.12)", border: "1.5px solid rgba(79,163,255,0.4)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>

                <Contact size={24} color="#4FA3FF" />

              </div>

              <h3 style={{ margin: "0 0 6px", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 700 }}>Иргэний үнэмлэх</h3>

              <p style={{ margin: 0, fontSize: 13, color: "var(--dim)", lineHeight: 1.5 }}>Иргэний үнэмлэхийн урд болон арын зургийг upload хийнэ үү</p>

            </div>

            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />

            <div className="upbox" onClick={() => fileRef.current?.click()}

              style={{ textAlign: "center", padding: "32px 20px", cursor: "pointer", marginBottom: 14 }}>

              {loading

                ? <><div style={{ width: 32, height: 32, border: "3px solid rgba(255,255,255,0.15)", borderTopColor: "#4FA3FF", borderRadius: "50%", animation: "spin .8s linear infinite", margin: "0 auto 10px" }} /><p style={{ margin: 0, color: "var(--dim)", fontSize: 13 }}>Татаж байна…</p></>

                : <><Upload size={28} color="#4FA3FF" style={{ marginBottom: 10 }} /><p style={{ margin: "0 0 4px", fontWeight: 600 }}>Зураг сонгох</p><small style={{ color: "var(--dim)" }}>JPG, PNG · 5MB хүртэл</small></>

              }

            </div>

            <p style={{ fontSize: 11.5, color: "var(--dim)", textAlign: "center", lineHeight: 1.5 }}>

              Таны мэдээлэл зөвхөн баталгаажуулалтад ашиглагдах бөгөөд аюулгүй хадгалагдана.

            </p>

          </>

        )}



        {stage === "review" && (

          <div style={{ textAlign: "center", padding: "24px 0" }}>

            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,210,63,0.12)", border: "2px solid #FFD23F", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>

              <Clock size={28} color="#FFD23F" />

            </div>

            <h3 style={{ margin: "0 0 8px", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 22, fontWeight: 700 }}>Туршилтын горим</h3>

            <p style={{ margin: "0 0 14px", color: "var(--dim)", fontSize: 13, lineHeight: 1.55 }}>

              Иргэний үнэмлэхийн баталгаажуулалт <b style={{ color: "#FFD23F" }}>одоогоор идэвхгүй</b> байна.
              Таны баримт бичиг <b style={{ color: "#FFD23F" }}>хаашаа ч илгээгдээгүй</b> бөгөөд энэ төхөөрөмжөөс гараагүй.

            </p>

            <div style={{ background: "rgba(255,210,63,0.08)", border: "1px solid rgba(255,210,63,0.25)", borderRadius: 12, padding: "10px 12px", marginBottom: 18 }}>
              <p style={{ margin: 0, fontSize: 11.5, color: "var(--dim)", lineHeight: 1.5, textAlign: "left" }}>
                Тэмдэг нь <b>зөвхөн үзүүлэн зорилготой</b> бөгөөд бодит баталгаажуулалт биш.
                Албан ёсны баталгаажуулалт нэвтэрмэгц танд мэдэгдэнэ.
              </p>
            </div>

            <button className="wiz__btn" onClick={() => { onVerified(); onClose(); }}

              style={{ width: "100%" }}>

              Ойлголоо

            </button>

          </div>

        )}

      </div>

    </div>

  );

}



/* ─────────────────────────────────────────────────

   УР ЧАДВАР БАТАЛГААЖУУЛАХ — мэргэжлийн тест

   ───────────────────────────────────────────────── */

const SKILL_QUESTIONS = {

  default: [

    { q: "Аюулгүй ажиллагааны үндсэн дүрэм аль нь вэ?", opts: ["Хамгаалалтгүй ажиллах", "PPE хэрэглэх заавал", "Ажлаа хурдан дуусгах", "Нөгөөдийн зааврыг дагах"], ans: 1 },

    { q: "Ажлын байранд гал гарвал юу хийх вэ?", opts: ["Гал унтраах", "Гүйж зугтах", "Дуудлагын утас 101 залгах, дараа нь нүүлгэн шилжүүлэх", "Хашгирах"], ans: 2 },

    { q: "Өргөх тоног төхөөрөмж ашиглахад юу чухал вэ?", opts: ["Хурд", "Ачааллын хязгаарыг баримтлах", "Гоё харагдах", "Хамгийн хуучин аргыг ашиглах"], ans: 1 },

    { q: "Ажлын гэрчилгээ / хувийн хамгаалах хэрэгсэл хаана хадгалах вэ?", opts: ["Гэртээ", "Ажлын байрандаа хүртэлхийн зайд", "Хаана ч болсон", "Менежерт өгөх"], ans: 1 },

    { q: "Хамтрагч гэмтсэн бол эхлээд юу хийх вэ?", opts: ["Ажлаа үргэлжлүүлэх", "Анхан шатны тусламж үзүүлэх ба 103 залгах", "Гэрт нь хүргэх", "Бусдад хэлэх"], ans: 1 },

  ],

  Гагнуурчин: [

    { q: "MIG гагнуурын хамгаалах хий юу вэ?", opts: ["Хүчилтөрөгч", "Аргон эсвэл CO₂", "Азот", "Гелий"], ans: 1 },

    { q: "Гагнуурын бүрэн хамгаалах тоног хэрэгсэлд юу ороход вэ?", opts: ["Зөвхөн маск", "Маск, бээлий, хөнцөр, хамгаалах хувцас", "Нүдний шил", "Бээлий л хангалттай"], ans: 1 },

    { q: "TIG гагнуур ямар зориулалтаар ашиглагддаг вэ?", opts: ["Зузаан ган", "Нимгэн металл, өнгөт металл", "Хуванцар", "Бетон"], ans: 1 },

    { q: "Гагнуурын холболтын чанарыг шалгах арга аль нь вэ?", opts: ["Нүдээр харах", "Бүтцийн шинжилгээ (NDT)", "Хоёулаа", "Жин хэмжих"], ans: 2 },

    { q: "Гагнуурын ажлын дараа хийх чухал зүйл юу вэ?", opts: ["Шууд гарах", "Хэрэгслийг цэвэрлэж, газар нутгийг аюулгүй болгох", "Найздаа хэлэх", "Зураг авах"], ans: 1 },

  ],

  Цахилгаанчин: [

    { q: "220В ажлын өмнө юу хийх вэ?", opts: ["Шууд ажиллах", "Хүчдэлийг тасалж, тест хийх", "Бээлий өмсөх", "Гутал солих"], ans: 1 },

    { q: "Фаз, нейтрал, газардуулгын өнгийг зөв тодорхойлно уу", opts: ["Хар/Улаан/Ногоон", "Хүрэн/Хөх/Шар-Ногоон", "Цагаан/Цэнхэр/Улаан", "Хаана ч ижил"], ans: 1 },

    { q: "Автомат таслагчийн (автомат) зориулалт юу вэ?", opts: ["Гэрэл асаах", "Хэт гүйдлийн хамгаалалт", "Дулааны хяналт", "Чийгийн хяналт"], ans: 1 },

    { q: "RCD (Дифф) юу хамгаалдаг вэ?", opts: ["Хэт ачааллаас", "Цахилгаан цохилтоос", "Тасралтгүй тэжээлд", "Хяналтын системд"], ans: 1 },

    { q: "Кабелийн хөндлөн огтлол ачааллаас хэрхэн сонгох вэ?", opts: ["Хамгийн нимгэн", "Ачааллын гүйдэлд тохируулан", "Хамгийн том", "Хамааралгүй"], ans: 1 },

  ],

};



function SkillVerifySheet({ category, onClose, onVerified }) {

  const qs = SKILL_QUESTIONS[category] || SKILL_QUESTIONS.default;

  const [idx, setIdx] = useState(0);

  const [chosen, setChosen] = useState(null);

  const [answers, setAnswers] = useState([]);

  const [stage, setStage] = useState("quiz"); // "quiz" | "result"



  const pick = (i) => setChosen(i);



  const next = () => {

    if (chosen === null) return;

    const upd = [...answers, chosen];

    if (idx + 1 < qs.length) {

      setAnswers(upd); setIdx(idx + 1); setChosen(null);

    } else {

      setAnswers(upd); setStage("result");

    }

  };



  const score = answers.filter((a, i) => a === qs[i].ans).length;

  const pct = Math.round((score / qs.length) * 100);

  const passed = pct >= 60;



  if (stage === "result") {

    return (

      <div className="sheet" onClick={onClose}>

        <div className="sheet__panel" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 32, textAlign: "center" }}>

          <button className="sheet__close" onClick={onClose}><X size={20} /></button>

          <div style={{ width: 72, height: 72, borderRadius: "50%", background: passed ? "rgba(61,220,151,0.12)" : "rgba(255,107,53,0.12)", border: `2px solid ${passed ? "#3DDC97" : "#FF6B35"}`, display: "grid", placeItems: "center", margin: "16px auto" }}>

            {passed ? <BadgeCheck size={34} color="#3DDC97" /> : <X size={34} color="#FF6B35" />}

          </div>

          <h3 style={{ margin: "0 0 6px", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 26, color: passed ? "#3DDC97" : "#FF6B35" }}>

            {passed ? "Тэнцлээ!" : "Тэнцсэнгүй"}

          </h3>

          <div style={{ fontSize: 40, fontWeight: 700, fontFamily: "'Barlow Condensed',sans-serif", margin: "10px 0" }}>{pct}%</div>

          <p style={{ color: "var(--dim)", fontSize: 13, marginBottom: 24 }}>

            {qs.length} асуулгаас {score} зөв · {passed ? "60% давж баталгаажлаа" : "60%-иас доош, дахин оролдоно уу"}

          </p>

          {qs.map((q, i) => (

            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, textAlign: "left", marginBottom: 10, fontSize: 12.5 }}>

              {answers[i] === q.ans

                ? <Check size={16} color="#3DDC97" style={{ flexShrink: 0, marginTop: 2 }} />

                : <X size={16} color="#FF6B35" style={{ flexShrink: 0, marginTop: 2 }} />}

              <span style={{ color: answers[i] === q.ans ? "var(--ink)" : "var(--dim)" }}>{q.q}</span>

            </div>

          ))}

          {passed

            ? <button className="wiz__btn" onClick={() => { onVerified(); onClose(); }} style={{ width: "100%", marginTop: 8 }}>Баталгаажуулах ✓</button>

            : <button className="wiz__btn" onClick={() => { setIdx(0); setChosen(null); setAnswers([]); setStage("quiz"); }} style={{ width: "100%", marginTop: 8 }}>Дахин оролдох</button>

          }

        </div>

      </div>

    );

  }



  const q = qs[idx];

  return (

    <div className="sheet" onClick={onClose}>

      <div className="sheet__panel" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 32 }}>

        <button className="sheet__close" onClick={onClose}><X size={20} /></button>

        <div style={{ marginBottom: 16 }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>

            <span style={{ fontSize: 12, color: "var(--dim)", fontWeight: 600 }}>УР ЧАДВАР ТЕСТ · {category || "Ерөнхий"}</span>

            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--dim)" }}>{idx + 1}/{qs.length}</span>

          </div>

          <div style={{ height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 4 }}>

            <div style={{ height: "100%", background: "linear-gradient(90deg,#FF6B35,#FFD23F)", borderRadius: 4, width: `${((idx) / qs.length) * 100}%`, transition: "width .3s" }} />

          </div>

        </div>

        <h3 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 20, fontWeight: 700, lineHeight: 1.3, marginBottom: 20 }}>{q.q}</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>

          {q.opts.map((o, i) => (

            <button key={i} onClick={() => pick(i)}

              style={{ textAlign: "left", padding: "13px 16px", borderRadius: 12, border: `1.5px solid ${chosen === i ? "#FF6B35" : "rgba(255,255,255,0.12)"}`, background: chosen === i ? "rgba(255,107,53,0.12)" : "rgba(255,255,255,0.04)", color: chosen === i ? "#FF6B35" : "var(--ink)", fontSize: 14, fontWeight: chosen === i ? 600 : 400, cursor: "pointer", transition: "all .15s" }}>

              <span style={{ marginRight: 10, opacity: 0.5 }}>{String.fromCharCode(65 + i)}.</span>{o}

            </button>

          ))}

        </div>

        <button className="wiz__btn" onClick={next} disabled={chosen === null}

          style={{ width: "100%", opacity: chosen === null ? 0.4 : 1 }}>

          {idx + 1 < qs.length ? "Дараах →" : "Дуусгах"}

        </button>

      </div>

    </div>

  );

}



/* ── Видео ярилцлагын урилга ────────────────────── */

const DURATIONS = ["15 минут", "30 минут", "45 минут", "1 цаг"];

const TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];



function VideoCallInviteSheet({ c, onClose, onInvited }) {

  if (!c) return null;

  const accent = TRADE[c.category]?.hex || "#FF6B35";

  const [stage, setStage] = useState("form"); // "form" | "sent"

  const [date, setDate] = useState("");

  const [time, setTime] = useState("");

  const [duration, setDuration] = useState("30 минут");

  const [msg, setMsg] = useState(`Сайн байна уу, ${c.name.split(" ")[0]}!\n\nТаны профайлыг үзсэн бөгөөд ярилцлагад урих хүсэлтэй байна. Та доорх цагт видео ярилцлагад оролцох боломжтой юу?`);

  const [platform, setPlatform] = useState("Google Meet");

  const [loading, setLoading] = useState(false);



  // Өнөөдрийн огноог default болгох

  const today = new Date().toISOString().split("T")[0];



  const canSend = date && time && msg.trim().length > 10;



  const send = () => {

    if (!canSend) return;

    setLoading(true);

    // TODO: backend — POST /api/interview/invite

    // { candidateId: c.id, date, time, duration, platform, message: msg }

    // → SMS + app notification ажил хайгчид илгээнэ

    setTimeout(() => {

      setLoading(false);

      setStage("sent");

      onInvited(c.id);

    }, 1400);

  };



  const platforms = [

    { name: "Google Meet", color: "#4FA3FF" },

    { name: "Zoom", color: "#4FA3FF" },

    { name: "Teams", color: "#9B8CFF" },

    { name: "Утсаар", color: "#3DDC97" },

  ];



  if (stage === "sent") {

    return (

      <div className="sheet" onClick={onClose}>

        <div className="sheet__panel" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 32, textAlign: "center" }}>

          <div style={{ width: 68, height: 68, borderRadius: "50%", background: "rgba(61,220,151,0.12)", border: "2px solid #3DDC97", display: "grid", placeItems: "center", margin: "20px auto 16px", animation: "pop .4s cubic-bezier(.34,1.56,.64,1)" }}>

            <Check size={32} color="#3DDC97" strokeWidth={2.5} />

          </div>

          <h3 style={{ margin: "0 0 8px", fontFamily: "'Barlow Condensed',sans-serif", fontSize: 24, fontWeight: 700 }}>Урилга илгээгдлээ!</h3>

          <p style={{ color: "var(--dim)", fontSize: 13, lineHeight: 1.6, margin: "0 0 6px" }}>

            <b style={{ color: "var(--ink)" }}>{c.name.split(" ")[0]}</b>-д {date}, {time} цагт<br />

            {duration}ийн ярилцлагын урилга илгээгдлээ.

          </p>

          <p style={{ color: "var(--dim)", fontSize: 12, marginBottom: 24 }}>

            Зөвшөөрсний дараа таны хянах самбарт "Ярилцлагатай" болж шилжинэ.

          </p>

          <button className="wiz__btn" onClick={onClose} style={{ width: "100%" }}>Хаах</button>

        </div>

      </div>

    );

  }



  return (

    <div className="sheet" onClick={onClose}>

      <div className="sheet__panel" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 28, maxHeight: "90vh", overflowY: "auto" }}>

        <button className="sheet__close" onClick={onClose}><X size={20} /></button>



        {/* Header */}

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>

          <Avatar c={c} size={48} />

          <div>

            <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 18 }}>{c.name}</div>

            <div style={{ fontSize: 12, color: accent, fontWeight: 600 }}>{c.category} · {c.years} жил</div>

          </div>

          <div style={{ marginLeft: "auto", width: 40, height: 40, borderRadius: 11, background: "rgba(61,220,151,0.12)", border: "1.5px solid rgba(61,220,151,0.3)", display: "grid", placeItems: "center" }}>

            <Video size={18} color="#3DDC97" />

          </div>

        </div>



        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>

          <CalendarClock size={14} color="#FF6B35" /> Ярилцлагын цаг товлох

        </div>



        {/* Огноо */}

        <div className="field" style={{ marginBottom: 12 }}>

          <label className="field__label">Огноо</label>

          <input type="date" value={date} min={today}

            onChange={(e) => setDate(e.target.value)}

            style={{ colorScheme: "dark" }} />

        </div>



        {/* Цагийн slot-ууд */}

        <div style={{ marginBottom: 12 }}>

          <div className="field__label" style={{ marginBottom: 8 }}>Цаг</div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>

            {TIME_SLOTS.map((t) => (

              <button key={t} onClick={() => setTime(t)}

                style={{ padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, border: `1.5px solid ${time === t ? "#FF6B35" : "rgba(255,255,255,0.12)"}`, background: time === t ? "rgba(255,107,53,0.14)" : "rgba(255,255,255,0.05)", color: time === t ? "#FF6B35" : "var(--ink)", cursor: "pointer", transition: "all .15s" }}>

                {t}

              </button>

            ))}

          </div>

        </div>



        {/* Үргэлжлэх хугацаа */}

        <div style={{ marginBottom: 12 }}>

          <div className="field__label" style={{ marginBottom: 8 }}>Үргэлжлэх хугацаа</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

            {DURATIONS.map((d) => (

              <button key={d} onClick={() => setDuration(d)}

                style={{ padding: "7px 12px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, border: `1.5px solid ${duration === d ? "#FF6B35" : "rgba(255,255,255,0.12)"}`, background: duration === d ? "rgba(255,107,53,0.14)" : "rgba(255,255,255,0.05)", color: duration === d ? "#FF6B35" : "var(--ink)", cursor: "pointer", transition: "all .15s" }}>

                {d}

              </button>

            ))}

          </div>

        </div>



        {/* Platform */}

        <div style={{ marginBottom: 12 }}>

          <div className="field__label" style={{ marginBottom: 8 }}>Платформ</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

            {platforms.map((p) => (

              <button key={p.name} onClick={() => setPlatform(p.name)}

                style={{ padding: "7px 12px", borderRadius: 10, fontSize: 12.5, fontWeight: 600, border: `1.5px solid ${platform === p.name ? p.color : "rgba(255,255,255,0.12)"}`, background: platform === p.name ? `${p.color}18` : "rgba(255,255,255,0.05)", color: platform === p.name ? p.color : "var(--ink)", cursor: "pointer", transition: "all .15s" }}>

                {p.name}

              </button>

            ))}

          </div>

        </div>



        {/* Мессеж */}

        <div className="field" style={{ marginBottom: 16 }}>

          <label className="field__label">Урилгын мессеж</label>

          <textarea rows={5} value={msg} onChange={(e) => setMsg(e.target.value)}

            style={{ resize: "vertical", lineHeight: 1.5 }} />

        </div>



        <button className="wiz__btn" onClick={send} disabled={!canSend || loading}

          style={{ width: "100%", opacity: !canSend || loading ? 0.5 : 1 }}>

          {loading

            ? "Илгээж байна…"

            : <><Video size={16} /> Урилга илгээх</>

          }

        </button>

      </div>

    </div>

  );

}



/* ── Холбоо барих цонх ──────────────────────────── */

function ContactSheet({ c, onClose, onContacted, onVideoInvite }) {

  if (!c) return null;

  const accent = TRADE[c.category]?.hex || "#FF6B35";

  return (

    <div className="sheet" onClick={onClose}>

      <div className="sheet__panel" onClick={(e) => e.stopPropagation()}>

        <button className="sheet__close" onClick={onClose} aria-label="Хаах">

          <X size={20} />

        </button>

        <div className="sheet__avatar"><Avatar c={c} size={76} /></div>

        <h3 className="sheet__name">{c.name}</h3>

        <p className="sheet__role" style={{ color: accent }}>

          {c.category} · {c.years} жил · {c.location}

        </p>



        {/* Видео ярилцлага — гол товч */}

        <button className="sheet__action"

          style={{ background: "linear-gradient(135deg,#3DDC97,#2bc880)", color: "var(--bg)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", marginBottom: 8 }}

          onClick={() => { onClose(); onVideoInvite(c); }}>

          <Video size={18} /> Видео ярилцлагад урих

        </button>



        {c.phone ? (
          <a className="sheet__action" href={`tel:${c.phone}`} style={{ background: accent }}
            onClick={() => onContacted(c.id)}>
            <Phone size={18} /> Утсаар залгах · {c.phone}
          </a>
        ) : (
          <div className="sheet__action" style={{ background: "rgba(255,255,255,0.05)", color: "var(--dim)", cursor: "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, pointerEvents: "none" }}>
            <Phone size={18} /> Утасны дугаар бүртгэлгүй
          </div>
        )}

        {c.email ? (
          <a className="sheet__action sheet__action--ghost" href={`mailto:${c.email}`}
            onClick={() => onContacted(c.id)}>
            Зурвас илгээх · {c.email}
          </a>
        ) : (
          <div className="sheet__action sheet__action--ghost" style={{ color: "var(--dim)", cursor: "default", pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
            Имэйл бүртгэлгүй
          </div>
        )}

        <p className="sheet__note">

          Видео ярилцлагын урилга илгээснээр {c.name.split(" ")[0]} таны хянах самбарт "Ярилцлагатай" болж шилжинэ.

        </p>

      </div>

    </div>

  );

}



/* ── Хадгалсан жагсаалт ─────────────────────────── */

function Shortlist({ items, stages, onRemove, onContact, onDownload, onBrowse, onOpen, onVideoInvite }) {

  const { t, lang } = useLang();

  if (items.length === 0) {

    return (

      <div className="shortlist__empty">

        <Inbox size={40} strokeWidth={1.5} />

        <h3>{t("emptyShortlist")}</h3>

        <p>{t("shortlistTitle")}</p>

        <button onClick={onBrowse}>{t("browseBtn")}</button>

      </div>

    );

  }

  return (

    <div className="shortlist">

      <div className="shortlist__head">

        <h2>{t("shortlistTitle")}</h2>

        <span>{items.length} {lang === "en" ? "saved" : "хадгалсан"}</span>

      </div>

      <ul className="shortlist__list">

        {items.map((c) => {

          const accent = TRADE[c.category]?.hex || "#FF6B35";

          const st = STAGE_MAP[stages[c.id] || "saved"];

          return (

            <li className="srow" key={c.id}>

              <div className="srow__poster" onClick={() => onOpen(c)}>

                <Avatar c={c} size={56} />

                {(() => {

                  const n = VERIFY_TYPES.filter((vt) => c.verified[vt.key]).length;

                  return n > 0 ? (

                    <span className="srow__verify" title={`${n}/3 ${t("verified")}`}>

                      <BadgeCheck size={11} /> {n}

                    </span>

                  ) : null;

                })()}

              </div>

              <div className="srow__body" onClick={() => onOpen(c)}>

                <h3 className="srow__name">{c.name} <span>· {c.age}</span></h3>

                <span className="srow__trade" style={{ color: accent }}>

                  {t(c.category)} · {c.years} {lang === "en" ? "yrs" : "жил"} · {tgr(c.salary)}

                </span>

                <span className="srow__stage" style={{ color: st.hex }}>

                  <CircleDot size={11} /> {t(st.key)}

                </span>

              </div>

              <div className="srow__acts">

                <button onClick={() => onVideoInvite(c)} aria-label="Видео ярилцлага"

                  title="Видео ярилцлагад урих"

                  style={{ color: stages[c.id] === "interview" ? "#3DDC97" : undefined }}>

                  <Video size={18} />

                </button>

                <button onClick={() => onContact(c)} aria-label="Холбогдох"><Phone size={18} /></button>

                <button onClick={() => onDownload(c)} aria-label="CV татах"><FileDown size={18} /></button>

                <button className="srow__del" onClick={() => onRemove(c.id)} aria-label="Устгах"><Trash2 size={18} /></button>

              </div>

            </li>

          );

        })}

      </ul>

    </div>

  );

}



/* ── Stage drill-down list ───────────────────────── */

function StageCandidateList({ stageKey, stageLabel, candidates, stages, onOpen, onBack }) {

  const { lang } = useLang();
  const L = (mn, en, ko) => lang === "en" ? en : lang === "ko" ? ko : mn;

  const items = candidates.filter(c => stages[c.id] === stageKey);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 16px 12px" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 10, width: 36, height: 36, display: "grid", placeItems: "center", color: "var(--ink)", cursor: "pointer", flexShrink: 0 }}>
          <ChevronLeft size={20} />
        </button>
        <div>
          <div style={{ fontSize: 11, color: "var(--dim)", fontWeight: 600, letterSpacing: 0.4 }}>
            {L("Хянах самбар", "Dashboard", "대시보드")}
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ink)", lineHeight: 1.2 }}>
            {stageLabel}
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: 14, textAlign: "center" }}>
          <div style={{ fontSize: 44 }}>🗂️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)" }}>
            {L("Одоогоор мэдээлэл алга", "No data yet", "아직 데이터 없음")}
          </div>
          <div style={{ fontSize: 13.5, color: "var(--dim)", lineHeight: 1.55, maxWidth: 260 }}>
            {L("Энэ төлөвт байгаа нэр дэвшигч хараахан байхгүй байна.", "No candidates in this stage yet.", "이 단계에 후보자가 없습니다.")}
          </div>
          <button onClick={onBack} style={{ marginTop: 8, padding: "11px 28px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "var(--ink)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {L("Буцах", "Back", "뒤로")}
          </button>
        </div>
      ) : (
        <div style={{ padding: "4px 16px 32px", display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((c) => {
            const accent = TRADE[c.category]?.hex || "#FF6B35";
            return (
              <div key={c.id} onClick={() => onOpen(c)} style={{
                background: "var(--bg-2)", borderRadius: 16,
                padding: "14px 16px", display: "flex", alignItems: "center", gap: 14,
                cursor: "pointer", transition: "background 150ms",
              }}
                onMouseEnter={e => e.currentTarget.style.background = "#222225"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--bg-2)"}
                onTouchStart={e => e.currentTarget.style.background = "#222225"}
                onTouchEnd={e => e.currentTarget.style.background = "var(--bg-2)"}
              >
                <Avatar c={c} size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>{c.name}</div>
                  <div style={{ fontSize: 12.5, color: accent, fontWeight: 600, marginTop: 2 }}>{c.category}</div>
                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{c.years}{L(" жил", " yrs", "년")} · {tgr(c.salary)}</div>
                </div>
                <ChevronRight size={16} color="rgba(255,255,255,0.25)" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



/* ── Employer Dashboard ─────────────────────────── */

function Dashboard({ stages, onOpen, onBrowse, candidates = CANDIDATES, activeStagePage, onStageOpen, onStageClose }) {

  const { t, lang } = useLang();

  const byStage = {};
  Object.entries(stages).forEach(([id, key]) => {
    (byStage[key] = byStage[key] || []).push(Number(id));
  });

  const cand = (id) => candidates.find((c) => c.id === id);
  const totalTracked = Object.keys(stages).length;
  const L = (mn, en, ko) => lang === "en" ? en : lang === "ko" ? ko : mn;

  const cols = [
    {
      key: "saved",
      icon: <Bookmark size={22} />,
      color: "#FF6A00",
      label: L("Хадгалсан", "Saved", "저장됨"),
      sub: L("Хадгалсан ярилцлагууд", "Saved conversations", "저장된 대화"),
    },
    {
      key: "contacted",
      icon: <Phone size={22} />,
      color: "#4FA3FF",
      label: L("Холбогдсон", "Contacted", "연락됨"),
      sub: L("Холбогдсон ярилцлагууд", "Contacted conversations", "연락된 대화"),
    },
    {
      key: "interview",
      icon: <Video size={22} />,
      color: "#9B7FFF",
      label: L("Ярилцаж байгаа", "Interviewing", "면접 중"),
      sub: L("Одоогоор идэвхтэй ярилцаж байгаа", "Currently active interviews", "현재 활성 면접"),
    },
    {
      key: "offer",
      icon: <Users size={22} />,
      color: "#FFD23F",
      label: L("Ярилцлага хүлээж байгаа", "Awaiting Interview", "면접 대기"),
      sub: L("Өргөдөл илгээсэн хүлээгдэж буй", "Application sent, pending", "지원서 제출 후 대기"),
    },
    {
      key: "hired",
      icon: <CheckCircle2 size={22} />,
      color: "#3DDC97",
      label: L("Дууссан", "Completed", "완료됨"),
      sub: L("Дууссан ярилцлагууд", "Completed conversations", "완료된 대화"),
    },
  ];

  // Stage drill-down view
  if (activeStagePage) {
    const col = cols.find(c => c.key === activeStagePage);
    return (
      <StageCandidateList
        stageKey={activeStagePage}
        stageLabel={col?.label || activeStagePage}
        candidates={candidates}
        stages={stages}
        onOpen={onOpen}
        onBack={onStageClose}
      />
    );
  }

  const notifCount = 4;

  const dashHeader = (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "22px 0 20px" }}>
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--ink)", margin: 0, letterSpacing: -0.4 }}>{t("dashTitle")}</h2>
        <p style={{ fontSize: 13, color: "var(--dim)", margin: "4px 0 0", lineHeight: 1.4 }}>
          {L("Бүх харилцааг нэг дороос удирдаарай.", "Manage all conversations in one place.", "모든 대화를 한 곳에서 관리하세요.")}
        </p>
      </div>
      <div style={{ position: "relative", flexShrink: 0, marginTop: 2 }}>
        <button style={{ width: 44, height: 44, borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "var(--ink)", cursor: "pointer", display: "grid", placeItems: "center" }}>
          <Bell size={19} />
        </button>
        {notifCount > 0 && (
          <div style={{ position: "absolute", top: -4, right: -4, background: "#FF6A00", color: "#fff", fontSize: 10, fontWeight: 900, minWidth: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: "2px solid #0F0F10" }}>
            {notifCount}
          </div>
        )}
      </div>
    </div>
  );

  if (totalTracked === 0) return (
    <div style={{ padding: "0 16px 32px" }}>
      {dashHeader}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 14 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "rgba(255,106,0,0.1)", border: "1.5px solid rgba(255,106,0,0.2)", display: "grid", placeItems: "center" }}>
          <LayoutDashboard size={28} color="#FF6A00" strokeWidth={1.5} />
        </div>
        <p style={{ color: "var(--dim)", fontSize: 14, textAlign: "center", lineHeight: 1.5, margin: 0 }}>{t("emptyDash")}</p>
        <button onClick={onBrowse} style={{ padding: "11px 28px", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#FF6A00,#e85d00)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{t("browseBtn")}</button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "0 16px 32px" }}>

      {dashHeader}

      {/* ── Stage cards ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {cols.map((col, i) => {
          const ids = byStage[col.key] || [];
          const count = ids.length;

          return (
            <div
              key={col.key}
              style={{
                background: "var(--bg-2)",
                borderRadius: 18,
                padding: "16px 18px",
                display: "flex", alignItems: "center", gap: 14,
                animation: `dashFadeIn 300ms ease both`,
                animationDelay: `${i * 50}ms`,
                cursor: "pointer",
                transition: "background 150ms",
              }}
              onClick={() => onStageOpen && onStageOpen(col.key)}
              onMouseEnter={e => e.currentTarget.style.background = "#222225"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--bg-2)"}
              onTouchStart={e => e.currentTarget.style.background = "#222225"}
              onTouchEnd={e => e.currentTarget.style.background = "var(--bg-2)"}
            >
              {/* Icon box */}
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: "rgba(255,255,255,0.06)",
                display: "grid", placeItems: "center",
                color: col.color,
              }}>
                {col.icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--ink)", lineHeight: 1.25 }}>
                  {col.label}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--dim)", marginTop: 3 }}>
                  {col.sub}
                </div>
              </div>

              {/* Count badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: count > 0 ? col.color : "rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800,
                  color: count > 0 ? "#fff" : "var(--dim)",
                }}>
                  {count}
                </div>
                <ChevronRight size={16} color="rgba(255,255,255,0.25)" />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );

}



/* ── BrandLogo — Official SwipeHire brand lockup ─────────────
 * SINGLE source of truth for all branding across the entire app.
 * (Splash, Login, Employer/Seeker dashboards, AI Recruiter,
 *  Settings, Drawer, About, Empty states, Website header.)
 *
 * Premium startup-style lockup (Linear / Stripe / Notion feel):
 *   • Icon on the left, wordmark beside it, single baseline.
 *   • Icon height default 34px (spec 32–36).
 *   • Wordmark height ~22px (spec 20–24) — auto-scales with icon.
 *   • 10px gap, vertically centered, clear space preserved.
 *   • Never stretched or cropped (objectFit: contain).
 *   • Subtle hover: scale(1.02), 220ms ease (when clickable).
 *
 * Props:
 *   size    – icon height in px (default 34)
 *   onClick – optional; enables hover/press animation
 *   showWord– set false for icon-only lockup (default true)
 *   style   – extra wrapper styles (e.g. clear-space margin)
 */
function BrandLogo({ size = 34, onClick, showWord = true, style = {} }) {
  // Wordmark scales to ~65% of icon height → 34px icon ⇒ 22px word (in 20–24 range)
  const wordSize = Math.round(size * 0.65);
  return (
    <div
      onClick={onClick}
      className={`brandlogo${onClick ? " brandlogo--tap" : ""}`}
      role={onClick ? "button" : undefined}
      aria-label="SwipeHire"
      style={{ gap: 10, ...style }}
    >
      <img
        src="/logo.png"
        alt=""
        aria-hidden="true"
        className="brandlogo__mark"
        style={{ height: size, width: size }}
      />
      {showWord && (
        <span className="brandlogo__word" style={{ fontSize: wordSize }}>
          Swipe<b>Hire</b>
        </span>
      )}
    </div>
  );
}

/* Back-compat aliases — all resolve to the single BrandLogo source */
function SwipeHireIcon({ size = 28 }) {
  return <BrandLogo size={size} showWord={false} />;
}
function SwipeHireLogo({ size = 34, onClick, style = {} }) {
  return <BrandLogo size={size} onClick={onClick} style={style} />;
}

/* ── Seeker Intro Screen ─────────────────────────── */

/* Legal document links — both app stores require these to be reachable
   from inside the app, not only from the store listing. */
function LegalLinks({ lang }) {
  const L = (mn, en, ko) => lang === "en" ? en : lang === "ko" ? ko : mn;
  const a = {
    color: "rgba(255,255,255,0.45)", fontSize: 11, textDecoration: "none",
    fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.14)", paddingBottom: 1,
  };
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", padding: "10px 0 2px" }}>
      <a href="/legal/privacy-policy.md" target="_blank" rel="noreferrer" style={a}>
        {L("Нууцлалын бодлого", "Privacy Policy", "개인정보 처리방침")}
      </a>
      <a href="/legal/terms-of-service.md" target="_blank" rel="noreferrer" style={a}>
        {L("Үйлчилгээний нөхцөл", "Terms of Service", "이용약관")}
      </a>
    </div>
  );
}

/* Consent checkbox — module scope so React keeps the same component type
   across renders and the checked state is not lost on re-render. */
function ConsentCheck({ on, onToggle, children }) {
  return (
    <label onClick={onToggle} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", padding: "2px 0" }}>
      <span style={{
        width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
        border: `1.5px solid ${on ? "#FF6B35" : "rgba(255,255,255,0.28)"}`,
        background: on ? "#FF6B35" : "transparent",
        display: "grid", placeItems: "center", color: "#fff", fontSize: 12, fontWeight: 900,
        transition: "all 150ms",
      }}>{on ? "✓" : ""}</span>
      <span style={{ fontSize: 12, color: "rgba(240,237,230,0.72)", lineHeight: 1.5 }}>{children}</span>
    </label>
  );
}

function SeekerIntroScreen({ onStart, onDemo, onBack }) {
  const { lang } = useLang();
  const L = (mn, en) => lang === "en" || lang === "ko" ? en : mn;

  // Consent must be given before any personal data is collected.
  const [agreed, setAgreed] = useState(false);
  const [ageOk, setAgeOk]   = useState(false);
  const canStart = agreed && ageOk;

  const cards = [
    { icon: "🎬", text: L("30 секундийн Video CV", "30-second Video CV") },
    { icon: "🏅", text: L("Talent Passport үүсгэнэ", "Build your Talent Passport") },
    { icon: "🤖", text: L("Ажил олгогч таныг AI Match-аар олно", "Employers find you via AI Match") },
  ];


  return (
    <div style={{ minHeight: "100dvh", position: "relative", overflow: "hidden", background: "radial-gradient(120% 70% at 50% 0%, rgba(255,107,53,.14), transparent 58%), #0d0c0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", boxSizing: "border-box" }}>
      {/* Back */}
      <button onClick={onBack} style={{ position: "absolute", top: 20, left: 16, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, width: 38, height: 38, display: "grid", placeItems: "center", color: "var(--ink, #f0ede6)", cursor: "pointer", fontSize: 19 }}>‹</button>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 34, position: "relative" }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: "#f6f4ef", marginBottom: 10, letterSpacing: "-.4px" }}>
          {L("SwipeHire гэж юу вэ?", "What is SwipeHire?")}
        </div>
        <div style={{ fontSize: 14, color: "rgba(240,237,230,0.55)", lineHeight: 1.6, maxWidth: 300, margin: "0 auto" }}>
          {L("Видео CV, Talent Passport, AI Match ашиглан ажил олох шинэ арга.", "A new way to find jobs using Video CV, Talent Passport, and AI Match.")}
        </div>
      </div>

      {/* Feature cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 360, marginBottom: 34, position: "relative" }}>
        {cards.map((c, i) => (
          <div key={i} style={{
            background: "linear-gradient(160deg,rgba(255,255,255,.075),rgba(255,255,255,.03))",
            border: "1px solid rgba(255,255,255,0.09)", borderRadius: 20, padding: "15px 17px",
            display: "flex", alignItems: "center", gap: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.07)",
            backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
            animation: `sh_rise 480ms cubic-bezier(.16,1,.3,1) ${i * 90}ms both`,
          }}>
            <span style={{
              width: 46, height: 46, flexShrink: 0, borderRadius: 14, display: "grid", placeItems: "center", fontSize: 23,
              background: "rgba(255,107,53,.13)", border: "1px solid rgba(255,107,53,.24)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.14)",
            }}>{c.icon}</span>
            <span style={{ fontSize: 14.5, fontWeight: 600, color: "#f0ede6", lineHeight: 1.35 }}>{c.text}</span>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 360 }}>
        {/* Consent gate — collected before any personal data is entered */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 14, padding: "13px 14px", borderRadius: 14, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <ConsentCheck on={ageOk} onToggle={() => setAgeOk(v => !v)}>
            {L("Би 18 нас хүрсэн.", "I am at least 18 years old.")}
          </ConsentCheck>
          <ConsentCheck on={agreed} onToggle={() => setAgreed(v => !v)}>
            {L("Би ", "I accept the ")}
            <a href="/legal/terms-of-service.md" target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: "#FF6B35", fontWeight: 700 }}>
              {L("Үйлчилгээний нөхцөл", "Terms of Service")}
            </a>
            {L(", ", " and ")}
            <a href="/legal/privacy-policy.md" target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: "#FF6B35", fontWeight: 700 }}>
              {L("Нууцлалын бодлого", "Privacy Policy")}
            </a>
            {L("-той танилцаж, профайл, видео CV, баримт бичгээ ажил олгогчид харуулахыг зөвшөөрч байна.",
               ", and consent to my profile, video CV and documents being shown to employers.")}
          </ConsentCheck>
        </div>

        <button
          onClick={() => canStart && onStart()}
          disabled={!canStart}
          title={canStart ? undefined : L("Эхлэхийн тулд зөвшөөрнө үү", "Please accept to continue")}
          style={{ width: "100%", padding: "16px 0", borderRadius: 16, border: "none",
            background: canStart ? "linear-gradient(135deg,#FF8A3D,#E85400)" : "rgba(255,107,53,0.22)",
            color: canStart ? "#fff" : "rgba(255,255,255,0.45)", fontWeight: 800, fontSize: 16,
            boxShadow: canStart ? "0 10px 26px rgba(255,107,53,.38)" : "none",
            cursor: canStart ? "pointer" : "not-allowed", transition: "all 200ms cubic-bezier(.22,1,.36,1)" }}>
          {L("Бүртгэл эхлүүлэх", "Get Started")}
        </button>
        <button onClick={onDemo} style={{ width: "100%", padding: "13px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "rgba(240,237,230,0.7)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          {L("Демо үзэх", "View Demo")}
        </button>
      </div>
    </div>
  );
}

/* ── Role сонгох дэлгэц (onboarding-ийн өмнө) ──── */

function RoleSelect({ onSelect }) {

  const { t, lang, toggleLang, theme, toggleTheme } = useLang();

  return (

    <div className="role">

      <div className="role__brand">
        <BrandLogo size={34} />
      </div>

      {/* Theme + Language toggle */}

      <button onClick={toggleTheme} aria-label="Theme" style={{
        position: "absolute", top: 20, right: 66,
        width: 34, height: 34, borderRadius: 10, border: "1px solid var(--hair-2)",
        background: "var(--surface)", cursor: "pointer", fontSize: 15,
      }}>{theme === "dark" ? "☀️" : "🌙"}</button>

      <button onClick={toggleLang} style={{

        position: "absolute", top: 20, right: 20,

        padding: "5px 12px", borderRadius: 10, border: "1px solid var(--hair-2)",

        background: "var(--surface)", color: "var(--ink)",

        fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: ".5px",

      }}>{lang === "mn" ? "EN" : lang === "en" ? "한국어" : "МН"}</button>



      <h1 className="role__title">{t("welcome")}</h1>

      <p className="role__sub">{t("tagline").split("\n").map((l, i) => <span key={i}>{l}{i === 0 && <br />}</span>)}</p>



      <button className="rolecard" onClick={() => onSelect("seeker")}>

        <span className="rolecard__icon" style={{ background: "rgba(61,220,151,.16)", color: "#3DDC97" }}>

          <HardHat size={28} />

        </span>

        <span className="rolecard__body">

          <b>{t("roleSeeker")}</b>

          <small>{t("roleSeekerSub")}</small>

        </span>

        <ArrowRight size={20} className="rolecard__arrow" />

      </button>



      <button className="rolecard" onClick={() => onSelect("employer")}>

        <span className="rolecard__icon" style={{ background: "rgba(255,107,53,.16)", color: "#FF6B35" }}>

          <Building2 size={28} />

        </span>

        <span className="rolecard__body">

          <b>{t("roleEmployer")}</b>

          <small>{t("roleEmployerSub")}</small>

        </span>

        <ArrowRight size={20} className="rolecard__arrow" />

      </button>



      <p className="role__foot">{t("trustLine")}</p>




    </div>

  );

}



/* ── Ажил хайгчийн onboarding wizard (8 алхам) ──── */

const SKILL_GROUPS = [

  {

    label: "💻 Компьютер & Технологи",

    skills: [

      "Компьютер ашиглах",

      "Microsoft Excel",

      "Microsoft Word",

      "PowerPoint",

      "Google Sheets",

      "Имэйл & Outlook",

      "AI программ (ChatGPT г.м.)",

      "Зургийн засвар (Photoshop г.м.)",

      "1С бүртгэл",

      "Хурдан бичих (10 хуруу)",

    ],

  },

  {

    label: "📱 Сошиал медиа & Контент",

    skills: [

      "Facebook хуудас удирдах",

      "Instagram контент",

      "TikTok видео",

      "YouTube",

      "Зар сурталчилгаа",

      "Нийтлэл бичих",

      "Фото авах",

      "Видео монтаж",

    ],

  },

  {

    label: "🤝 Хүн хоорондын чадвар",

    skills: [

      "Багаар ажиллах",

      "Баг удирдах",

      "Харилцагчтай ажиллах",

      "Борлуулалт",

      "Сургалт явуулах",

      "Хүний нөөц",

      "Тайлан бичих",

      "Хэлэлцээр хийх",

    ],

  },

  {

    label: "🌐 Хэл мэдлэг",

    skills: [

      "Англи хэл (үндсэн)",

      "Англи хэл (чөлөөт)",

      "Хятад хэл",

      "Орос хэл",

      "Солонгос хэл",

      "Япон хэл",

    ],

  },

  {

    label: "🚗 Тээвэр & Логистик",

    skills: [

      "Жолооны үнэмлэх (B)",

      "Жолооны үнэмлэх (C)",

      "Хүргэлт & курьер",

      "Агуулах удирдлага",

      "Ачаа зөөвөр",

      "Форклифт",

    ],

  },

  {

    label: "🔧 Гар ур чадвар",

    skills: [

      "Цахилгааны ажил",

      "Сантехникийн ажил",

      "Гагнуур",

      "Мужааны ажил",

      "Будах, засах",

      "Тоног төхөөрөмж засвар",

      "Аюулгүй ажиллагаа",

    ],

  },

  {

    label: "📦 Үйлдвэр & Боловсруулалт",

    skills: [

      "Чанарын хяналт",

      "Конвейер шугам",

      "Боолт савлагаа",

      "Хог ангилах",

      "Хүнс боловсруулах",

      "Тогооч & гал тогоо",

      "Угаалга, цэвэрлэгээ",

    ],

  },

];

const SKILL_OPTIONS = SKILL_GROUPS.flatMap((g) => g.skills);

const GENDERS = ["Эрэгтэй", "Эмэгтэй"];

const LOCATIONS = [

  // Улаанбаатар + дүүргүүд

  "Улаанбаатар – Багануур",

  "Улаанбаатар – Багахангай",

  "Улаанбаатар – Баянгол",

  "Улаанбаатар – Баянзүрх",

  "Улаанбаатар – Налайх",

  "Улаанбаатар – Сонгинохайрхан",

  "Улаанбаатар – Сүхбаатар",

  "Улаанбаатар – Хан-Уул",

  "Улаанбаатар – Чингэлтэй",

  // 21 аймаг

  "Архангай",

  "Баян-Өлгий",

  "Баянхонгор",

  "Булган",

  "Говь-Алтай",

  "Говьсүмбэр",

  "Дархан-Уул",

  "Дорноговь",

  "Дорнод",

  "Дундговь",

  "Завхан",

  "Орхон",

  "Өвөрхангай",

  "Өмнөговь",

  "Сүхбаатар",

  "Сэлэнгэ",

  "Төв",

  "Увс",

  "Ховд",

  "Хөвсгөл",

  "Хэнтий",

];

const CATS = CATEGORIES.filter((c) => c !== "Бүгд");

const AVAIL_OPTIONS = ["Шууд", "2 долоо хоногийн дотор", "1 сарын дотор", "Тохиролцоно"];



/* ── Цалингийн drum wheel ────────────────────────── */

const SALARY_VALUES = Array.from({ length: 91 }, (_, i) => (i + 5) * 100000);

// 500,000 → 9,500,000 (100к алхам)



function SalaryDrumPicker({ value, onChange }) {

  const labels = SALARY_VALUES.map((v) => tgr(v) + " / сар");

  const numVal = Number(value) || SALARY_VALUES[19]; // default 2,400,000

  const idx = SALARY_VALUES.indexOf(SALARY_VALUES.find((v) => v === numVal) ?? SALARY_VALUES[19]);



  return (

    <div>

      <DrumPicker

        items={labels}

        value={labels[idx < 0 ? 19 : idx]}

        onChange={(label) => {

          const i = labels.indexOf(label);

          if (i >= 0) onChange(String(SALARY_VALUES[i]));

        }}

        height={220}

        itemH={46}

      />

      {value && (

        <div style={{ textAlign: "center", fontSize: 13, color: "#FF6B35", fontWeight: 700, marginTop: 6 }}>

          Сонгосон: {tgr(Number(value))} / сар

        </div>

      )}

    </div>

  );

}



/* ── Ур чадвар drum wheel step ───────────────────── */

function SkillDrumStep({ skills, onToggle }) {

  const catLabels = SKILL_GROUPS.map((g) => g.label);

  const [catVal, setCatVal] = useState(catLabels[0]);

  const [skillVal, setSkillVal] = useState(SKILL_GROUPS[0].skills[0]);



  const currentGroup = SKILL_GROUPS.find((g) => g.label === catVal) || SKILL_GROUPS[0];



  const handleCatChange = (v) => {

    setCatVal(v);

    const grp = SKILL_GROUPS.find((g) => g.label === v);

    if (grp) setSkillVal(grp.skills[0]);

  };



  const addSkill = () => {

    if (skillVal) onToggle(skillVal);

  };



  const isSelected = skills.includes(skillVal);



  return (

    <div className="wiz__fields">

      <span className="wiz__hint">

        Ангилал → чадвар сонгоод <b style={{ color: "#FF6B35" }}>+ Нэмэх</b> дарна уу.

        {skills.length > 0 && <b style={{ color: "#FF6B35" }}> ({skills.length} сонгосон)</b>}

      </span>



      {/* Хоёр drum хажуу хажуугаар */}

      <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>

        {/* Зүүн: ангилал */}

        <div style={{ flex: "0 0 42%", background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "10px 6px" }}>

          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--dim)", textAlign: "center", letterSpacing: ".5px", marginBottom: 6 }}>АНГИЛАЛ</div>

          <DrumPicker

            items={catLabels}

            value={catVal}

            onChange={handleCatChange}

            height={200}

            itemH={40}

          />

        </div>

        {/* Баруун: чадвар */}

        <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: "10px 6px" }}>

          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--dim)", textAlign: "center", letterSpacing: ".5px", marginBottom: 6 }}>ЧАДВАР</div>

          <DrumPicker

            items={currentGroup.skills}

            value={currentGroup.skills.includes(skillVal) ? skillVal : currentGroup.skills[0]}

            onChange={setSkillVal}

            height={200}

            itemH={40}

          />

        </div>

      </div>



      {/* Нэмэх товч */}

      <button onClick={addSkill}

        style={{

          width: "100%", padding: "13px", borderRadius: 14, border: "none",

          background: isSelected

            ? "rgba(61,220,151,0.15)"

            : "linear-gradient(135deg,#FF6B35,#e85a22)",

          color: isSelected ? "#3DDC97" : "#fff",

          fontSize: 15, fontWeight: 700, cursor: "pointer",

          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,

          boxShadow: isSelected ? "none" : "0 4px 18px rgba(255,107,53,0.35)",

          border: isSelected ? "1.5px solid rgba(61,220,151,0.35)" : "none",

          transition: "all .2s",

        }}>

        {isSelected ? <><Check size={16} /> Сонгогдсон — хасах</> : <><Plus size={16} /> {skillVal || "Сонгоно уу"} нэмэх</>}

      </button>



      {/* Өөрийн чадвар */}

      <SkillCustomInput

        onAdd={(s) => { if (s && !skills.includes(s)) onToggle(s); }}

        selectedSkills={skills}

        onToggle={onToggle}

      />



      {/* Сонгосон жагсаалт */}

      {skills.length > 0 && (

        <div style={{ padding: "12px 14px", background: "rgba(61,220,151,0.07)", border: "1px solid rgba(61,220,151,0.2)", borderRadius: 12 }}>

          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#3DDC97", marginBottom: 8 }}>

            ✓ Сонгосон ур чадварууд ({skills.length})

          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>

            {skills.map((s) => (

              <span key={s} onClick={() => onToggle(s)} style={{

                display: "inline-flex", alignItems: "center", gap: 4,

                padding: "5px 10px", borderRadius: 999,

                background: "rgba(61,220,151,0.14)", border: "1px solid rgba(61,220,151,0.35)",

                color: "#3DDC97", fontSize: 12, fontWeight: 600, cursor: "pointer",

              }}>

                {s} <X size={11} />

              </span>

            ))}

          </div>

        </div>

      )}

    </div>

  );

}



/* ── Өөрийн чадвар нэмэх + drum wheel хадгалах ──── */

const CUSTOM_SKILLS_KEY = "swipehire_custom_skills";



function loadCustomSkills() {

  try { return JSON.parse(localStorage.getItem(CUSTOM_SKILLS_KEY) || "[]"); }

  catch { return []; }

}

function saveCustomSkills(list) {

  try { localStorage.setItem(CUSTOM_SKILLS_KEY, JSON.stringify(list)); } catch {}

}



function SkillCustomInput({ onAdd, selectedSkills, onToggle }) {

  const [val, setVal] = useState("");

  const [saved, setSaved] = useState(loadCustomSkills);

  const [drumVal, setDrumVal] = useState(saved[0] || "");



  const submit = () => {

    const trimmed = val.trim();

    if (!trimmed) return;

    const next = saved.includes(trimmed) ? saved : [trimmed, ...saved];

    setSaved(next);

    saveCustomSkills(next);

    setDrumVal(trimmed);

    onAdd(trimmed);

    setVal("");

  };



  // drum-ээр сонгох → toggle

  const handleDrumChange = (v) => {

    setDrumVal(v);

    onToggle(v);

  };



  return (

    <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14, marginTop: 6 }}>

      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dim)", letterSpacing: ".5px", marginBottom: 10 }}>

        ➕ Өөрийн чадвар нэмэх

      </div>



      {/* Input */}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: saved.length ? 14 : 0 }}>

        <input

          value={val}

          onChange={(e) => setVal(e.target.value)}

          onKeyDown={(e) => e.key === "Enter" && submit()}

          placeholder="Жишээ: Нийтлэгч, Хог шүүрдэгч, Нохой харах…"

          style={{

            flex: 1, background: "var(--bg-2)", border: "1.5px dashed rgba(255,255,255,0.2)",

            borderRadius: 12, color: "var(--ink)", fontFamily: "inherit",

            fontSize: 13.5, padding: "10px 13px", outline: "none", transition: "border-color .2s",

          }}

          onFocus={(e) => e.target.style.borderColor = "rgba(255,107,53,0.5)"}

          onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.2)"}

        />

        <button onClick={submit} disabled={!val.trim()}

          style={{

            flexShrink: 0, width: 40, height: 40, borderRadius: 11,

            background: val.trim() ? "linear-gradient(135deg,#FF6B35,#e85a22)" : "rgba(255,255,255,0.07)",

            border: "none", color: val.trim() ? "#fff" : "var(--dim)",

            display: "grid", placeItems: "center", cursor: val.trim() ? "pointer" : "default",

            transition: "all .2s", boxShadow: val.trim() ? "0 4px 14px rgba(255,107,53,0.35)" : "none",

          }}>

          <Plus size={18} />

        </button>

      </div>



      {/* Хадгалагдсан чадваруудын drum wheel */}

      {saved.length > 0 && (

        <div style={{

          background: "rgba(255,107,53,0.05)", border: "1px solid rgba(255,107,53,0.18)",

          borderRadius: 14, padding: "12px 14px",

        }}>

          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--dim)", marginBottom: 8, letterSpacing: ".4px" }}>

            МИНИЙ НЭМСЭН ЧАДВАРУУД — гүйлгэж сонго

          </div>

          <DrumPicker

            items={saved}

            value={drumVal || saved[0]}

            onChange={handleDrumChange}

            height={160}

            itemH={40}

          />

          {drumVal && (

            <div style={{ textAlign: "center", marginTop: 8, fontSize: 12 }}>

              {selectedSkills?.includes(drumVal)

                ? <span style={{ color: "#3DDC97", fontWeight: 700 }}>✓ Сонгогдсон</span>

                : <span style={{ color: "var(--dim)" }}>Дарж сонго</span>

              }

            </div>

          )}

          {/* Устгах */}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>

            {saved.map((s) => (

              <span key={s} style={{

                display: "inline-flex", alignItems: "center", gap: 3,

                padding: "4px 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 600,

                background: selectedSkills?.includes(s) ? "rgba(61,220,151,0.14)" : "rgba(255,255,255,0.06)",

                border: `1px solid ${selectedSkills?.includes(s) ? "rgba(61,220,151,0.35)" : "rgba(255,255,255,0.1)"}`,

                color: selectedSkills?.includes(s) ? "#3DDC97" : "var(--dim)",

                cursor: "pointer",

              }}

                onClick={() => { onToggle(s); setDrumVal(s); }}>

                {s}

                <span onClick={(e) => {

                  e.stopPropagation();

                  const next = saved.filter((x) => x !== s);

                  setSaved(next); saveCustomSkills(next);

                  if (drumVal === s) setDrumVal(next[0] || "");

                  if (selectedSkills?.includes(s)) onToggle(s);

                }} style={{ opacity: 0.5, marginLeft: 2 }}>×</span>

              </span>

            ))}

          </div>

        </div>

      )}

    </div>

  );

}



/* ── Мэргэжил сонгогч: drum + өөрийн мэргэжил ─── */

function DrumCategoryPicker({ value, onChange }) {

  const CUSTOM_KEY = "__custom__";

  const [customMode, setCustomMode] = useState(!CATS.includes(value) && value !== "");

  const [customVal, setCustomVal] = useState(!CATS.includes(value) ? value : "");

  const customInputRef = useRef(null);



  useEffect(() => {

    if (customMode && customInputRef.current) customInputRef.current.focus();

  }, [customMode]);



  const allItems = [...CATS, "Өөрийн мэргэжил…"];



  const handleDrum = (v) => {

    if (v === "Өөрийн мэргэжил…") {

      setCustomMode(true);

      onChange(customVal || "");

    } else {

      setCustomMode(false);

      onChange(v);

    }

  };



  const drumValue = customMode ? "Өөрийн мэргэжил…" : (CATS.includes(value) ? value : CATS[0]);



  return (

    <div>

      <DrumPicker items={allItems} value={drumValue} onChange={handleDrum} height={220} itemH={46} />

      {customMode && (

        <div style={{ marginTop: 10 }}>

          <input ref={customInputRef}

            value={customVal}

            onChange={(e) => { setCustomVal(e.target.value); onChange(e.target.value); }}

            placeholder="Жишээ: Кран операторч, Уурхайн техникч…"

            style={{ width: "100%", boxSizing: "border-box", background: "var(--bg-2)",

              border: "1.5px solid #FF6B35", borderRadius: 12, color: "var(--ink)",

              fontFamily: "inherit", fontSize: 15, padding: "12px 14px", outline: "none" }}

          />

          {customVal && (

            <div style={{ marginTop: 6, fontSize: 12, color: "#3DDC97", display: "flex", alignItems: "center", gap: 5 }}>

              <Check size={12} /> Сонгосон мэргэжил: <b>{customVal}</b>

            </div>

          )}

        </div>

      )}

    </div>

  );

}



/* ── iOS-style drum/wheel picker ──────────────────

   items: string[]

   value: string

   onChange: (val: string) => void

   height: px (default 200)

   itemH: px (default 44)

─────────────────────────────────────────────────── */

function DrumPicker({ items, value, onChange, height = 200, itemH = 44 }) {

  const listRef = useRef(null);

  const visCount = Math.floor(height / itemH);

  const pad = Math.floor(visCount / 2);

  const padded = [...Array(pad).fill(""), ...items, ...Array(pad).fill("")];

  const selIdx = items.indexOf(value);



  // Scroll to selected on mount / value change; fire onChange on mount if no value

  const onChangRef = useRef(onChange);

  onChangRef.current = onChange;

  useEffect(() => {

    const el = listRef.current;

    if (!el) return;

    const idx = selIdx < 0 ? 0 : selIdx;

    el.scrollTop = idx * itemH;

    // Fire initial value if parent has no value yet

    if (!value && items[idx]) onChangRef.current(items[idx]);

  }, []); // eslint-disable-line react-hooks/exhaustive-deps



  useEffect(() => {

    const el = listRef.current;

    if (!el || selIdx < 0) return;

    el.scrollTop = selIdx * itemH;

  }, [selIdx, itemH]);



  const onScroll = () => {

    const el = listRef.current;

    if (!el) return;

    const idx = Math.round(el.scrollTop / itemH);

    const val = items[idx];

    if (val && val !== value) onChange(val);

  };



  // Snap on touch end / mouse up

  const snapTo = () => {

    const el = listRef.current;

    if (!el) return;

    const idx = Math.round(el.scrollTop / itemH);

    el.scrollTo({ top: idx * itemH, behavior: "smooth" });

  };



  return (

    <div style={{ position: "relative", height, overflow: "hidden", userSelect: "none" }}>

      {/* Center highlight */}

      <div style={{

        position: "absolute", left: 0, right: 0,

        top: "50%", transform: "translateY(-50%)",

        height: itemH, pointerEvents: "none", zIndex: 2,

        background: "rgba(255,107,53,0.10)",

        borderTop: "1.5px solid rgba(255,107,53,0.35)",

        borderBottom: "1.5px solid rgba(255,107,53,0.35)",

        borderRadius: 10,

      }} />

      {/* Top fade */}

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "35%", pointerEvents: "none", zIndex: 3,

        background: "linear-gradient(180deg, var(--bg,#0d0c0a) 0%, transparent 100%)" }} />

      {/* Bottom fade */}

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "35%", pointerEvents: "none", zIndex: 3,

        background: "linear-gradient(0deg, var(--bg,#0d0c0a) 0%, transparent 100%)" }} />



      <div ref={listRef} onScroll={onScroll} onTouchEnd={snapTo} onMouseUp={snapTo}

        style={{

          height: "100%", overflowY: "scroll", scrollbarWidth: "none",

          WebkitOverflowScrolling: "touch",

          scrollSnapType: "y mandatory",

        }}>

        <style>{`.drum-hide::-webkit-scrollbar{display:none}`}</style>

        {padded.map((item, i) => {

          const realIdx = i - pad;

          const dist = Math.abs(realIdx - (selIdx < 0 ? 0 : selIdx));

          const opacity = item === "" ? 0 : Math.max(0.25, 1 - dist * 0.28);

          const scale = item === "" ? 1 : Math.max(0.78, 1 - dist * 0.08);

          const isActive = item === value;

          return (

            <div key={i}

              onClick={() => item && onChange(item)}

              style={{

                height: itemH, display: "flex", alignItems: "center", justifyContent: "center",

                scrollSnapAlign: "center",

                fontSize: isActive ? 16 : 14,

                fontWeight: isActive ? 700 : 400,

                color: isActive ? "#FF6B35" : "var(--ink,#f7f5f0)",

                opacity,

                transform: `scale(${scale})`,

                transition: "opacity .15s, transform .15s, color .15s",

                cursor: item ? "pointer" : "default",

                letterSpacing: isActive ? ".3px" : 0,

                fontFamily: isActive ? "'Barlow Condensed',sans-serif" : "inherit",

              }}>

              {item}

            </div>

          );

        })}

      </div>

    </div>

  );

}



const blankForm = {

  name: "", age: "", gender: "", category: "Гагнуурчин", location: "Улаанбаатар – Багануур", phone: "", email: "",

  about: "",

  experience: [{ role: "", org: "", period: "" }],

  education: [{ degree: "", school: "", period: "" }],

  skills: [],

  videoMode: "",

  certs: [], cvFile: "", videoFileName: "",

  salary: "1500000", availableFrom: "Шууд",

  skillTestScore: null, skillTestLevel: "", skillTestCompleted: false,

  avatarPath: "", cvPath: "", videoPath: "",

};

/* ── Ур чадварын тестийн асуултууд ────────────────── */
const GENERAL_SKILL_QS = [
  {
    q: "Та ажилдаа ирээд хамгийн түрүүнд юу хийх вэ?",
    opts: ["Найзуудтайгаа ярилцана", "Утсаа үзнэ", "Ажлын байр, багаж хэрэгслээ шалгаж ажлаа эхэлнэ", "Амарна"],
    correct: 2,
  },
  {
    q: "Хөдөлмөрийн гэрээнд хэзээ гарын үсэг зурах ёстой вэ?",
    opts: ["Цалингаа авсны дараа", "Ажил эхлэхээс өмнө буюу эхний өдөр", "Нэг сарын дараа", "Хүссэн үедээ"],
    correct: 1,
  },
  {
    q: "3 + 4 + 2 − 4 × 2 = ?",
    opts: ["1", "5", "10", "-3"],
    correct: 0,
  },
  {
    q: "Ажлаас хоцрох бол яах ёстой вэ?",
    opts: ["Юу ч хэлэхгүй", "Маргааш тайлбарлана", "Урьдчилан ажил олгогч эсвэл удирдагчдаа мэдэгдэнэ", "Хүссэн үедээ очно"],
    correct: 2,
  },
  {
    q: "Үйлчлүүлэгч эсвэл хамтран ажиллагчтайгаа хэрхэн харилцах ёстой вэ?",
    opts: ["Уурлаж ярилцана", "Тоохгүй өнгөрнө", "Маргалдана", "Эелдэг, хүндэтгэлтэй харилцана"],
    correct: 3,
  },
];

function skillLevel(score) {
  if (score >= 90) return { label: "Маш сайн",                  dot: "🟢", color: "#3DDC97" };
  if (score >= 70) return { label: "Сайн",                       dot: "🟡", color: "#FFD23F" };
  if (score >= 50) return { label: "Дунд",                       dot: "🟠", color: "#FF8C42" };
  return              { label: "Сайжруулах шаардлагатай",        dot: "🔴", color: "#FF5050" };
}

function SkillTestBadge({ score, compact = false }) {
  if (score === null || score === undefined) return null;
  const { label, dot, color } = skillLevel(score);
  if (compact) return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700,
      background:`${color}18`, border:`1px solid ${color}44`, borderRadius:8,
      padding:"3px 8px", color }}>
      {dot} {score}/100
    </span>
  );
  return (
    <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.09)",
      borderRadius:14, padding:"14px 16px", display:"flex", flexDirection:"column", gap:6 }}>
      <div style={{ fontSize:12, fontWeight:700, color:"var(--dim)", letterSpacing:0.5 }}>УР ЧАДВАРЫН ТЕСТ</div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:22, fontWeight:900, color:"var(--ink)" }}>{score}<span style={{ fontSize:14, color:"var(--dim)", fontWeight:600 }}>/100</span></span>
        <span style={{ fontSize:13, fontWeight:700, color, display:"flex", alignItems:"center", gap:5 }}>{dot} {label}</span>
      </div>
    </div>
  );
}



/* ── Subscription / Paywall ─────────────────────────── */

const FREE_SWIPES = 3;



const EMPLOYER_PLANS = [

  { id: "1m", label: "1 сар", price: "₮49,999", sub: "сарын", badge: null },

  { id: "6m", label: "6 сар", price: "₮499,999", sub: "6 сарын", badge: "ХЭМНЭЛТТЭЙ" },

  { id: "1y", label: "1 жил", price: "₮1,999,999", sub: "жилийн", badge: "ХАМГИЙН САЙН" },

];

const SEEKER_PLANS = [

  { id: "1m", label: "1 сар", price: "₮4,999", sub: "сарын", badge: null },

  { id: "6m", label: "6 сар", price: "₮49,999", sub: "6 сарын", badge: "ХЭМНЭЛТТЭЙ" },

  { id: "1y", label: "1 жил", price: "₮199,999", sub: "жилийн", badge: "ХАМГИЙН САЙН" },

];



function PaywallSheet({ role, onSubscribe, onClose }) {

  const { t, lang } = useLang();

  const L = (mn, en, ko) => lang === "en" ? en : lang === "ko" ? ko : mn;

  const [selPlan, setSelPlan] = useState("6m");
  const [step, setStep] = useState("plans"); // "plans" | "success"

  const plans = [
    {
      id: "1m",
      months: L("1 САР", "1 MONTH", "1개월"),
      price: "₮49,000",
      perMonth: "₮49,000/сар",
      badge: null,
      savePct: null,
    },
    {
      id: "6m",
      months: L("6 САР", "6 MONTHS", "6개월"),
      price: "₮249,000",
      perMonth: "₮41,500/сар",
      badge: L("ХЭМНЭЛТ 15%", "SAVE 15%", "15% 절약"),
      savePct: 15,
    },
    {
      id: "12m",
      months: L("12 САР", "12 MONTHS", "12개월"),
      price: "₮399,000",
      perMonth: "₮33,250/сар",
      badge: L("ХАМГИЙН АШИГТАЙ", "BEST VALUE", "최고의 가치"),
      badgeColor: "#3DDC97",
      savePct: 32,
    },
  ];

  // PRO эрхийн давуу талууд (төлбөрийн аргын оронд)
  const benefits = role === "employer" ? [
    { icon: "🔓", text: L("Хязгааргүй нэр дэвшигч үзэх", "Unlimited candidate swipes", "무제한 후보자 보기") },
    { icon: "📞", text: L("Шууд холбоо барих эрх", "Direct contact access", "직접 연락 가능") },
    { icon: "🤖", text: L("AI Рекрутер бүрэн эрх", "Full AI Recruiter access", "AI 리크루터 전체 이용") },
    { icon: "⭐", text: L("Онцлох компанийн тэмдэг", "Featured company badge", "추천 기업 배지") },
  ] : [
    { icon: "🔓", text: L("Хязгааргүй ажлын зар үзэх", "Unlimited job swipes", "무제한 채용공고 보기") },
    { icon: "🚀", text: L("Профайл эхэнд харагдана", "Priority profile visibility", "프로필 우선 노출") },
    { icon: "🤖", text: L("AI Match санал авах", "AI Match recommendations", "AI 매칭 추천") },
    { icon: "🏅", text: L("PRO тэмдэг Talent Passport дээр", "PRO badge on Talent Passport", "탤런트 패스포트 PRO 배지") },
  ];

  const chosen = plans.find(p => p.id === selPlan);

  if (step === "success") return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#3DDC97", fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: -0.5, marginBottom: 8 }}>
          {L("Амжилттай!", "Success!", "성공!")}
        </div>
        <div style={{ fontSize: 15, color: "var(--dim)", marginBottom: 32, lineHeight: 1.5 }}>
          {L("SwipeHire PRO идэвхжлээ. Бүх боломжууд нээгдлээ!", "SwipeHire PRO is now active. All features unlocked!", "SwipeHire PRO가 활성화되었습니다!")}
        </div>
        <button onClick={() => { onSubscribe(selPlan); }} style={{ padding: "14px 40px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#3DDC97,#2bc47f)", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
          {L("Үргэлжлүүлэх", "Continue", "계속")}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "linear-gradient(180deg,#18171200 0%,#181712 12%)", flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "0 18px 40px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#FF6A00,#e85d00)", display: "grid", placeItems: "center", boxShadow: "0 4px 16px rgba(255,106,0,.4)" }}>
                <Crown size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--ink)", fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: -.3 }}>SwipeHire PRO</div>
                <div style={{ fontSize: 11.5, color: "#FF6A00", fontWeight: 700 }}>{L("Бүх боломжийг нээ", "Unlock everything", "모든 기능 잠금 해제")}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 10, width: 36, height: 36, display: "grid", placeItems: "center", color: "var(--dim)", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>

          {/* Plan cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {plans.map(p => {
              const active = selPlan === p.id;
              return (
                <div key={p.id} onClick={() => setSelPlan(p.id)} style={{
                  background: active ? "rgba(255,106,0,0.1)" : "var(--bg-2)",
                  border: `2px solid ${active ? "#FF6A00" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 18, padding: "18px 20px", cursor: "pointer",
                  transition: "all 220ms ease",
                  transform: active ? "scale(1.01)" : "scale(1)",
                  boxShadow: active ? "0 6px 28px rgba(255,106,0,0.2)" : "none",
                  display: "flex", alignItems: "center",
                }}>
                  {/* Radio */}
                  <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${active ? "#FF6A00" : "rgba(255,255,255,0.2)"}`, background: active ? "#FF6A00" : "transparent", display: "grid", placeItems: "center", flexShrink: 0, marginRight: 14, transition: "all 180ms" }}>
                    {active && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff" }} />}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: active ? "var(--ink)" : "var(--dim)", fontFamily: "'Barlow Condensed',sans-serif", letterSpacing: 0.5 }}>{p.months}</div>
                    <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>{p.perMonth}</div>
                  </div>

                  {/* Price + badge */}
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: active ? "var(--ink)" : "var(--dim)" }}>{p.price}</div>
                    {p.badge && (
                      <div style={{ fontSize: 9.5, fontWeight: 800, color: p.badgeColor || "#FF6A00", background: (p.badgeColor || "#FF6A00") + "18", border: `1px solid ${(p.badgeColor || "#FF6A00")}33`, borderRadius: 6, padding: "2px 7px", marginTop: 4, display: "inline-block", letterSpacing: 0.4 }}>
                        {p.badge}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* PRO эрхийн давуу талууд — төлбөрийн аргын оронд */}
          {step === "plans" && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dim)", letterSpacing: 0.6, marginBottom: 12 }}>
                {L("PRO ЭРХЭЭР НЭЭГДЭХ БОЛОМЖУУД", "WHAT YOU GET WITH PRO", "PRO 혜택")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {benefits.map((b, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    background: "var(--bg-2)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 14, padding: "14px 16px",
                  }}>
                    <span style={{ fontSize: 22, lineHeight: 1, width: 30, textAlign: "center" }}>{b.icon}</span>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", flex: 1 }}>{b.text}</span>
                    <Check size={16} color="#3DDC97" />
                  </div>
                ))}
              </div>
              <button onClick={() => setStep("success")} style={{
                width: "100%", padding: "16px", borderRadius: 16, border: "none",
                background: "linear-gradient(135deg,#FF6A00,#e85d00)", color: "#fff",
                fontSize: 16, fontWeight: 800, cursor: "pointer",
                boxShadow: "0 6px 24px rgba(255,106,0,0.35)",
              }}>
                👑 {L("PRO болох", "Go PRO", "PRO 시작하기")} — {chosen?.price}
              </button>
              <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--dim)", marginTop: 10 }}>
                {L("Туршилтын хугацаанд төлбөр авахгүй", "Free during the beta period", "베타 기간 동안 무료")}
              </div>
              <button onClick={onClose} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", background: "transparent", color: "var(--dim)", fontSize: 13.5, cursor: "pointer", marginTop: 6 }}>
                {t("laterBtn")}
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  );

}



/* ── Ажил хайгчийн job swipe feed ──────────────────── */

function JobFeed() {

  const { t, lang } = useLang();

  const [idx, setIdx] = useState(0);

  const [liked, setLiked] = useState([]);

  const [gone, setGone] = useState([]);

  const [denied, setDenied] = useState([]); // passed jobs (left swipe)

  const [drag, setDrag] = useState({ x: 0, active: false });

  const [subscribed, setSubscribed] = useState(false);

  const [showPaywall, setShowPaywall] = useState(false);

  const [showDenied, setShowDenied] = useState(false);

  const startX = useRef(0);

  // Phase 3b: load real active jobs when Supabase is configured. Mapped onto a
  // mock template so every field the card reads exists (no undefined arrays).
  const [liveJobs, setLiveJobs] = useState(null);
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    listActiveJobs({ limit: 100 }).then((rows) => {
      const base = JOBS[0];
      const fmt = (j) => { const a = j.salary_min, b = j.salary_max; return a && b ? `${a.toLocaleString()}–${b.toLocaleString()}` : a ? `${a.toLocaleString()}+` : b ? b.toLocaleString() : "—"; };
      const mapped = (rows || []).map((j) => ({
        ...base, id: j.id, role: j.title || base.role, type: j.category || base.type,
        location: j.location || base.location, about: j.description || "", salary: fmt(j),
        company: "", logo: (j.title || "?").slice(0, 2).toUpperCase(), skills: [], benefits: [], urgent: false,
      }));
      if (mapped.length) setLiveJobs(mapped);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const jobs = liveJobs || JOBS;

  const job = jobs[idx];

  const done = idx >= jobs.length;

  const swipeCount = gone.length;



  const decide = (dir) => {

    if (!subscribed && swipeCount >= FREE_SWIPES) {

      setShowPaywall(true);

      return;

    }

    if (dir === "right") {
      setLiked((p) => [...p, job.id]);
      // Phase 3c: a right-swipe is an application (configured mode only; real job ids).
      if (SUPABASE_CONFIGURED && liveJobs) applyToJob({ jobId: job.id }).catch(() => {});
    }

    else setDenied((p) => [...p, job.id]);

    setGone((p) => [...p, job.id]);

    setIdx((i) => i + 1);

    setDrag({ x: 0, active: false });

  };



  const undo = () => {

    if (idx === 0) return;

    const prevId = gone[gone.length - 1];

    setGone((p) => p.slice(0, -1));

    setLiked((p) => p.filter((id) => id !== prevId));

    setDenied((p) => p.filter((id) => id !== prevId));

    setIdx((i) => i - 1);

  };



  const onTouchStart = (e) => {

    startX.current = e.touches[0].clientX;

    setDrag({ x: 0, active: true });

  };

  const onTouchMove = (e) => {

    setDrag({ x: e.touches[0].clientX - startX.current, active: true });

  };

  const onTouchEnd = () => {

    if (drag.x > 80) decide("right");

    else if (drag.x < -80) decide("left");

    else setDrag({ x: 0, active: false });

  };



  const rotate = drag.x * 0.08;

  const opacity = Math.max(0.7, 1 - Math.abs(drag.x) / 400);



  return (

    <div style={{

      position: "absolute", inset: 0, bottom: "var(--tabh)",

      background: "var(--bg)", display: "flex", flexDirection: "column",

      alignItems: "center", justifyContent: "flex-start", zIndex: 10,

      overflow: "hidden",

    }}>

      {/* Header */}

      <div style={{

        width: "100%", padding: "16px 20px 8px",

        display: "flex", alignItems: "center", justifyContent: "space-between",

      }}>

        <div>

          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>{t("jobFeedTitle")}</div>

          <div style={{ fontSize: 12, color: "var(--dim)" }}>{t("jobFeedSub")}</div>

        </div>

        <div style={{

          background: "rgba(255,107,53,0.12)", borderRadius: 10,

          padding: "4px 12px", fontSize: 13, fontWeight: 700, color: "#FF6B35",

        }}>

          {subscribed

            ? <><Crown size={13} style={{marginRight:3}}/> Pro</>

            : swipeCount >= FREE_SWIPES

              ? <span style={{color:"#ff4444"}}>{t("limitDone")}</span>

              : `${FREE_SWIPES - swipeCount} ${t("freeLeft")}`

          }

        </div>

      </div>



      {done ? (

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>

          <div style={{ fontSize: 48 }}>🎉</div>

          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", textAlign: "center" }}>{t("allDone")}</div>

          <div style={{ fontSize: 14, color: "var(--dim)", textAlign: "center" }}>{liked.length} {t("allDoneSub")}</div>

          <button onClick={() => { setIdx(0); setLiked([]); setGone([]); }} style={{

            padding: "12px 28px", borderRadius: 14, border: "none",

            background: "linear-gradient(135deg,#FF6B35,#e85a22)", color: "#fff",

            fontWeight: 700, fontSize: 15, cursor: "pointer",

          }}>{t("watchAgain")}</button>

        </div>

      ) : (

        <>

          {/* Card stack */}

          <div style={{ flex: 1, width: "100%", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 16px" }}>

            {/* Next card preview */}

            {jobs[idx + 1] && (

              <div style={{

                position: "absolute", width: "calc(100% - 48px)", maxWidth: 420,

                borderRadius: 24, overflow: "hidden",

                transform: "scale(0.94) translateY(16px)",

                opacity: 0.5, pointerEvents: "none",

              }}>

                <JobCard job={jobs[idx + 1]} mini />

              </div>

            )}

            {/* Current card */}

            <div

              onTouchStart={onTouchStart}

              onTouchMove={onTouchMove}

              onTouchEnd={onTouchEnd}

              style={{

                position: "relative", width: "calc(100% - 32px)", maxWidth: 440,

                borderRadius: 24, overflow: "hidden", cursor: "grab",

                transform: `translateX(${drag.x}px) rotate(${rotate}deg)`,

                opacity,

                transition: drag.active ? "none" : "transform .35s cubic-bezier(.34,1.56,.64,1), opacity .2s",

                boxShadow: "0 12px 48px rgba(0,0,0,.5)",

                touchAction: "none",

              }}>

              {/* Like / Nope overlay */}

              {drag.x > 30 && (

                <div style={{ position: "absolute", top: 24, left: 20, zIndex: 10, transform: `rotate(-12deg)` }}>

                  <span style={{ border: "3px solid #3DDC97", color: "#3DDC97", fontWeight: 900, fontSize: 22, padding: "4px 14px", borderRadius: 8, opacity: Math.min(1, drag.x / 80) }}>{lang === "en" ? "PASSPORT APPLY ✓" : lang === "ko" ? "PASSPORT 지원 ✓" : "ХҮСЭЛТ ИЛГЭЭХ ✓"}</span>

                </div>

              )}

              {drag.x < -30 && (

                <div style={{ position: "absolute", top: 24, right: 20, zIndex: 10, transform: `rotate(12deg)` }}>

                  <span style={{ border: "3px solid #ff4444", color: "#ff4444", fontWeight: 900, fontSize: 22, padding: "4px 14px", borderRadius: 8, opacity: Math.min(1, -drag.x / 80) }}>ҮЛДЭЭХ ✗</span>

                </div>

              )}

              <JobCard job={job} />

            </div>

          </div>



          {/* Action buttons */}

          <div style={{ display: "flex", gap: 16, padding: "12px 0 20px", alignItems: "center", justifyContent: "center" }}>

            {/* Undo */}

            <button onClick={undo} disabled={idx === 0} style={{

              width: 48, height: 48, borderRadius: "50%",

              border: "2px solid rgba(255,210,63,0.4)",

              background: idx === 0 ? "rgba(255,255,255,0.04)" : "rgba(255,210,63,0.1)",

              color: idx === 0 ? "rgba(255,255,255,0.2)" : "#FFD23F",

              display: "grid", placeItems: "center", cursor: idx === 0 ? "default" : "pointer",

              fontSize: 18, transition: "all .15s",

            }}>↩</button>



            {/* Pass */}

            <button onClick={() => decide("left")} style={{

              width: 60, height: 60, borderRadius: "50%", border: "2px solid rgba(255,68,68,0.4)",

              background: "rgba(255,68,68,0.1)", color: "#ff4444",

              display: "grid", placeItems: "center", cursor: "pointer", fontSize: 24,

              transition: "transform .15s", boxShadow: "0 4px 16px rgba(255,68,68,0.2)",

            }}>✗</button>



            {/* Apply */}

            <button onClick={() => decide("right")} style={{

              width: 72, height: 72, borderRadius: "50%", border: "none",

              background: "linear-gradient(135deg,#3DDC97,#2bc47f)", color: "#fff",

              display: "grid", placeItems: "center", cursor: "pointer", fontSize: 28,

              boxShadow: "0 6px 24px rgba(61,220,151,0.4)", transition: "transform .15s",

            }}>✓</button>



            {/* Denied history */}

            <button onClick={() => setShowDenied(true)} style={{

              width: 48, height: 48, borderRadius: "50%",

              border: "2px solid rgba(255,255,255,0.12)",

              background: denied.length > 0 ? "rgba(255,107,53,0.1)" : "rgba(255,255,255,0.04)",

              color: denied.length > 0 ? "#FF6B35" : "rgba(255,255,255,0.25)",

              display: "grid", placeItems: "center", cursor: denied.length > 0 ? "pointer" : "default",

              fontSize: 15, transition: "all .15s", position: "relative",

            }}>

              🗂

              {denied.length > 0 && (

                <span style={{

                  position: "absolute", top: -4, right: -4,

                  background: "#FF6B35", color: "#fff",

                  fontSize: 10, fontWeight: 800, borderRadius: "50%",

                  width: 18, height: 18, display: "grid", placeItems: "center",

                }}>{denied.length}</span>

              )}

            </button>

          </div>



          {/* Denied jobs bottom sheet */}

          {showDenied && (

            <div style={{

              position: "fixed", inset: 0, zIndex: 60,

              background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",

              display: "flex", alignItems: "flex-end",

            }} onClick={() => setShowDenied(false)}>

              <div onClick={e => e.stopPropagation()} style={{

                width: "100%", maxHeight: "70vh",

                background: "var(--bg-2)", borderRadius: "22px 22px 0 0",

                padding: "0 0 32px",

                display: "flex", flexDirection: "column",

              }}>

                {/* handle */}

                <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>

                  <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />

                </div>

                <div style={{ padding: "12px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>

                  <div>

                    <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ink)" }}>

                      {lang === "en" ? "Skipped jobs" : "Үлдээсэн ажлын зарууд"}

                    </div>

                    <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 2 }}>

                      {lang === "en" ? "Tap to reconsider" : "Дарж дахин хэлэлцэх"}

                    </div>

                  </div>

                  <button onClick={() => setShowDenied(false)} style={{

                    background: "rgba(255,255,255,0.08)", border: "none", borderRadius: "50%",

                    width: 32, height: 32, color: "var(--dim)", fontSize: 16, cursor: "pointer",

                    display: "grid", placeItems: "center",

                  }}>✕</button>

                </div>

                <div style={{ overflowY: "auto", flex: 1, padding: "4px 16px" }}>

                  {denied.length === 0 ? (

                    <div style={{ textAlign: "center", color: "var(--dim)", padding: "32px 0", fontSize: 14 }}>

                      {lang === "en" ? "No skipped jobs yet" : "Үлдээсэн зар алга"}

                    </div>

                  ) : denied.map(id => {

                    const j = JOBS.find(j => j.id === id);

                    if (!j) return null;

                    return (

                      <div key={id} style={{

                        display: "flex", alignItems: "center", gap: 12,

                        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",

                        borderRadius: 14, padding: "12px 14px", marginBottom: 8,

                      }}>

                        <div style={{

                          width: 44, height: 44, borderRadius: 12, flexShrink: 0,

                          background: "linear-gradient(135deg,#2a2a28,#1a1a18)",

                          border: "1.5px solid rgba(255,255,255,0.1)",

                          display: "grid", placeItems: "center",

                          fontSize: 18,

                        }}>{j.company[0]}</div>

                        <div style={{ flex: 1, minWidth: 0 }}>

                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{j.title}</div>

                          <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 1 }}>{j.company} · {j.salary}</div>

                        </div>

                        <button onClick={() => {

                          // дахин stack-д буцаана

                          const jobIdx = JOBS.findIndex(jj => jj.id === id);

                          setDenied(p => p.filter(d => d !== id));

                          setGone(p => p.filter(g => g !== id));

                          if (jobIdx < idx) setIdx(i => i - 1);

                          setShowDenied(false);

                        }} style={{

                          padding: "6px 14px", borderRadius: 10, border: "1.5px solid rgba(255,107,53,0.5)",

                          background: "rgba(255,107,53,0.1)", color: "#FF6B35",

                          fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0,

                          whiteSpace: "nowrap",

                        }}>

                          {lang === "en" ? "Reconsider" : "Дахин харах"}

                        </button>

                      </div>

                    );

                  })}

                </div>

              </div>

            </div>

          )}

        </>

      )}



      {/* Seeker paywall */}

      {showPaywall && (

        <PaywallSheet

          role="seeker"

          onSubscribe={(plan) => { if (!SUPABASE_CONFIGURED) setSubscribed(true); /* legacy demo-only; prod entitlements are server-side */ setShowPaywall(false); }}

          onClose={() => setShowPaywall(false)}

        />

      )}

    </div>

  );

}



function JobCard({ job, mini }) {

  return (

    <div style={{ background: "var(--bg-2)", minHeight: mini ? 240 : 480 }}>

      {/* Poster image */}

      <div style={{ height: mini ? 120 : 220, position: "relative", overflow: "hidden" }}>

        <img src={job.poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />

        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(26,25,15,0.95) 100%)" }} />

        {job.urgent && (

          <div style={{ position: "absolute", top: 14, right: 14, background: "#FF6B35", color: "#fff", fontWeight: 800, fontSize: 11, padding: "4px 10px", borderRadius: 8, letterSpacing: ".5px" }}>ЯАРАЛТАЙ</div>

        )}

        {/* Company logo */}

        <div style={{ position: "absolute", bottom: 16, left: 16, display: "flex", alignItems: "center", gap: 10 }}>

          <div style={{ width: 44, height: 44, borderRadius: 12, background: job.logoColor + "22", border: `2px solid ${job.logoColor}55`, display: "grid", placeItems: "center", fontWeight: 900, fontSize: 13, color: job.logoColor }}>

            {job.logo}

          </div>

          <div>

            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{job.company}</div>

            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{job.role}</div>

          </div>

        </div>

      </div>



      {!mini && (

        <div style={{ padding: "14px 18px 16px" }}>

          {/* Info row */}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>

            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--dim)" }}>

              📍 {job.location}

            </span>

            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#FF6B35", fontWeight: 700 }}>

              💰 ₮{job.salary}

            </span>

            <span style={{ fontSize: 11.5, background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "2px 8px", color: "var(--dim)" }}>

              {job.type}

            </span>

          </div>



          {/* About */}

          <p style={{ fontSize: 13.5, color: "var(--dim)", lineHeight: 1.55, marginBottom: 12 }}>{job.about}</p>



          {/* Required skills */}

          <div style={{ marginBottom: 12 }}>

            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", letterSpacing: ".5px", marginBottom: 6 }}>ШААРДАХ ЧАД ВАР</div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>

              {job.skills.map(s => (

                <span key={s} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.25)", color: "#FF6B35", fontWeight: 600 }}>{s}</span>

              ))}

            </div>

          </div>



          {/* Benefits */}

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>

            {job.benefits.map(b => (

              <span key={b} style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 999, background: "rgba(61,220,151,0.08)", border: "1px solid rgba(61,220,151,0.2)", color: "#3DDC97" }}>✓ {b}</span>

            ))}

          </div>

        </div>

      )}

    </div>

  );

}



/* ── Ур чадварын тест алхам ─────────────────────────── */
function SkillTestStep({ f, upd }) {
  const [qIdx, setQIdx] = useState(() => {
    // resume from last unanswered if test not completed
    if (f.skillTestCompleted) return GENERAL_SKILL_QS.length;
    return 0;
  });
  const [answers, setAnswers] = useState(() => Array(GENERAL_SKILL_QS.length).fill(null));
  const [revealed, setRevealed] = useState(false);

  // If already completed, show result
  if (f.skillTestCompleted) {
    const { label, dot, color } = skillLevel(f.skillTestScore);
    return (
      <div style={{ padding: "8px 0", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dim)", letterSpacing: 0.6 }}>УР ЧАДВАРЫН ТЕСТ</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: "var(--ink)", lineHeight: 1 }}>
            {f.skillTestScore}<span style={{ fontSize: 20, color: "var(--dim)" }}>/100</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color, display: "flex", alignItems: "center", gap: 8 }}>
            {dot} {label}
          </div>
          <button onClick={() => { upd({ skillTestCompleted: false, skillTestScore: null, skillTestLevel: "" }); setAnswers(Array(GENERAL_SKILL_QS.length).fill(null)); setQIdx(0); setRevealed(false); }}
            style={{ marginTop: 4, fontSize: 12, color: "var(--dim)", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 14px", cursor: "pointer" }}>
            Дахин өгөх
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--dim)", textAlign: "center", margin: 0 }}>
          Дараагийн алхамд шилжихийн тулд доорх товчийг дарна уу.
        </p>
      </div>
    );
  }

  const q = GENERAL_SKILL_QS[qIdx];
  const selected = answers[qIdx];
  const isLast = qIdx === GENERAL_SKILL_QS.length - 1;

  const choose = (optIdx) => {
    if (revealed) return;
    const next = [...answers];
    next[qIdx] = optIdx;
    setAnswers(next);
    setRevealed(true);
  };

  const advance = () => {
    if (!revealed) return;
    if (!isLast) {
      setQIdx(qIdx + 1);
      setRevealed(false);
    } else {
      // calculate score
      const correct = answers.filter((a, i) => a === GENERAL_SKILL_QS[i].correct).length;
      const score = correct * 20;
      const { label } = skillLevel(score);
      upd({ skillTestScore: score, skillTestLevel: label, skillTestCompleted: true });
    }
  };

  const OPTS = ["A", "B", "C", "D"];

  return (
    <div style={{ padding: "4px 0", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "#FF6B35", borderRadius: 99,
            width: `${((qIdx + (revealed ? 1 : 0)) / GENERAL_SKILL_QS.length) * 100}%`,
            transition: "width 0.35s ease" }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--dim)", whiteSpace: "nowrap" }}>
          {qIdx + 1}/{GENERAL_SKILL_QS.length}
        </span>
      </div>

      {/* Question card */}
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 16, padding: "18px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--ink)", lineHeight: 1.5 }}>
          {q.q}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {q.opts.map((opt, i) => {
            const isCorrect = i === q.correct;
            const isSelected = i === selected;
            let bg = "rgba(255,255,255,0.04)";
            let border = "1px solid rgba(255,255,255,0.10)";
            let color = "var(--ink)";
            if (revealed) {
              if (isCorrect) { bg = "rgba(61,220,151,0.15)"; border = "1.5px solid #3DDC97"; color = "#3DDC97"; }
              else if (isSelected) { bg = "rgba(255,80,80,0.12)"; border = "1.5px solid #FF5050"; color = "#FF5050"; }
            } else if (isSelected) {
              bg = "rgba(255,107,53,0.15)"; border = "1.5px solid #FF6B35"; color = "#FF6B35";
            }
            return (
              <button key={i} onClick={() => choose(i)}
                style={{ display: "flex", alignItems: "center", gap: 12, background: bg, border,
                  borderRadius: 12, padding: "11px 14px", cursor: revealed ? "default" : "pointer",
                  textAlign: "left", transition: "all 0.2s" }}>
                <span style={{ fontSize: 12, fontWeight: 800, color, minWidth: 18 }}>{OPTS[i]}</span>
                <span style={{ fontSize: 14, color, lineHeight: 1.4 }}>{opt}</span>
                {revealed && isCorrect && <span style={{ marginLeft: "auto", fontSize: 16 }}>✓</span>}
                {revealed && isSelected && !isCorrect && <span style={{ marginLeft: "auto", fontSize: 16 }}>✗</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Дараах / Дуусгах */}
      {revealed && (
        <button onClick={advance}
          style={{ background: "#FF6B35", color: "#fff", border: "none", borderRadius: 14,
            padding: "15px 0", fontWeight: 800, fontSize: 15, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {isLast ? "Тестийг дуусгах" : `Дараагийн асуулт →`}
        </button>
      )}
      {!revealed && (
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--dim)", margin: 0 }}>
          Хариултаа сонгоно уу
        </p>
      )}
    </div>
  );
}

function SeekerDashboard({ onSwitchRole, flash, onRegister, onGoHome, onLogout }) {

  const { t, lang, toggleLang, theme, toggleTheme } = useLang();

  const _lsGet = (k, fb) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : fb; } catch { return fb; } };

  const _seekerMeta = _lsGet("swipehire_seeker_meta", {});
  const [published, setPublished] = useState(() => !!_seekerMeta.published);
  const [verified, setVerified] = useState(() => _seekerMeta.verified || { phone: false, id: false, skill: false });

  const [step, setStep] = useState(1);

  const [f, setF] = useState(() => _lsGet("swipehire_seeker", blankForm));

  const [verifySheet, setVerifySheet] = useState(null); // "phone" | "id" | "skill"

  const [seekerTab, setSeekerTab] = useState("profile"); // "profile" | "jobs" | "offers" | "finance" | "ai"

  const [seekerSubscribed, setSeekerSubscribed] = useState(false);

  // Persist seeker profile to localStorage on change
  // Persist the profile draft, but never the document contents. A CV read as
  // a base64 data URL is a private document; localStorage is unencrypted,
  // readable by any script on the origin, and survives until explicitly
  // cleared. The file name is kept so the UI can show what was attached;
  // the bytes live in memory for the session and belong in Supabase Storage
  // (private bucket + signed URL) once configured.
  useEffect(() => {
    try {
      const { cvFileData, videoFile, ...safe } = f;
      localStorage.setItem("swipehire_seeker", JSON.stringify(safe));
    } catch {}
  }, [f]);
  useEffect(() => { try { localStorage.setItem("swipehire_seeker_meta", JSON.stringify({ published, verified })); } catch {} }, [published, verified]);

  // Phase 2: when Supabase is configured, sync the candidate profile to the DB
  // on publish/unpublish. The service whitelists fields and never persists CV
  // bytes. In demo mode (not configured) this is inert.
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    const id = setTimeout(() => {
      updateCandidateProfile({ ...f, published }).catch(() => {});
    }, 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [published]);

  // Phase 2b: load the candidate profile from the DB on mount (returning user).
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    let cancelled = false;
    getCandidateProfile().then((row) => {
      if (cancelled || !row) return;
      setF((prev) => ({
        ...prev,
        name: row.full_name ?? prev.name,
        age: row.age != null ? String(row.age) : prev.age,
        gender: row.gender ?? prev.gender,
        category: row.category ?? prev.category,
        location: row.location ?? prev.location,
        phone: row.phone ?? prev.phone,
        email: row.email ?? prev.email,
        about: row.about ?? prev.about,
        experience: row.experience?.length ? row.experience : prev.experience,
        education: row.education?.length ? row.education : prev.education,
        skills: row.skills?.length ? row.skills : prev.skills,
        salary: row.salary_expectation != null ? String(row.salary_expectation) : prev.salary,
        availableFrom: row.available_from ?? prev.availableFrom,
        avatarPath: row.avatar_path ?? prev.avatarPath,
        cvPath: row.cv_path ?? prev.cvPath,
        videoPath: row.video_path ?? prev.videoPath,
      }));
      if (row.published) setPublished(true);
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const TOTAL = 9;



  const upd = (patch) => setF((p) => ({ ...p, ...patch }));

  const updRow = (field, i, patch) =>

    setF((p) => ({ ...p, [field]: p[field].map((r, j) => (j === i ? { ...r, ...patch } : r)) }));

  const addRow = (field, blank) => setF((p) => ({ ...p, [field]: [...p[field], blank] }));

  const delRow = (field, i) =>

    setF((p) => ({ ...p, [field]: p[field].filter((_, j) => j !== i) }));

  const toggleSkill = (s) =>

    setF((p) => ({ ...p, skills: p.skills.includes(s) ? p.skills.filter((x) => x !== s) : [...p.skills, s] }));

  // File input refs for Android-safe native pickers
  const videoInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const certInputRef = useRef(null);
  const cvInputRef = useRef(null);
  const photoInputRef = useRef(null);

  // Profile photo → downscale to 300px and store as data URL (localStorage-safe)
  const onPhotoPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const chk = checkUpload(file, "image", lang);
    if (!chk.ok) { flash(chk.error); e.target.value = ""; return; }
    const img = new Image();
    img.onload = () => {
      const size = 300;
      const canvas = document.createElement("canvas");
      const scale = size / Math.min(img.width, img.height);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      setF((p) => ({ ...p, photo: canvas.toDataURL("image/jpeg", 0.82) }));
    };
    img.src = URL.createObjectURL(file);
    e.target.value = "";
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  /* ── Data subject rights ──────────────────────────────────────────
   * Export  — GDPR Art. 20 (portability) / Play data-portability rule
   * Deletion — GDPR Art. 17 / Google Play account-deletion requirement
   * Both operate on everything this app actually stores about the user.
   */
  const exportMyData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      notice: "Complete copy of the personal data SwipeHire stores about you on this device.",
      profile: _lsGet("swipehire_seeker", {}),
      profileMeta: _lsGet("swipehire_seeker_meta", {}),
      customSkills: _lsGet("swipehire_custom_skills", []),
      language: _lsGet("swipehire_lang", "mn"),
      role: _lsGet("swipehire_role", null),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `swipehire-my-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash?.(lang === "en" ? "Your data was downloaded ✓" : "Өгөгдөл татагдлаа ✓");
  };

  const deleteMyAccount = () => {
    // Erase every key holding personal data. Language preference is kept
    // so the confirmation screen stays readable.
    ["swipehire_seeker", "swipehire_seeker_meta", "swipehire_custom_skills",
     "swipehire_role", "swipehire_saved", "swipehire_stages", "swipehire_notes"]
      .forEach(k => { try { localStorage.removeItem(k); } catch {} });
    setShowDeleteAccount(false);
    window.location.reload();
  };

  // ── Passport edit mode: fix one missing field, then return to Passport ──
  const [passportEditMode,  setPassportEditMode]  = useState(false);
  const [passportFocusField, setPassportFocusField] = useState(null);

  const returnToPassport = () => {
    setPassportEditMode(false);
    setPassportFocusField(null);
    setPublished(true);
  };

  // Android hardware back while editing from Passport → return to Passport
  useEffect(() => {
    if (!passportEditMode) return;
    window.history.pushState({ passportEdit: true }, "");
    const handler = () => returnToPassport();
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passportEditMode]);

  // Scroll to the specific missing field when entering edit mode
  useEffect(() => {
    if (!passportEditMode || !passportFocusField) return;
    const t = setTimeout(() => {
      document.getElementById(`wiz-${passportFocusField}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => clearTimeout(t);
  }, [passportEditMode, passportFocusField, /* re-run on step change */]);

  const handleWizardBack = () => {
    if (passportEditMode) { returnToPassport(); return; }
    const hasProgress = f.name || f.category || f.about || f.skills.length > 0;
    if (step === 1 && hasProgress) {
      setShowLeaveConfirm(true);
    } else if (step === 1) {
      if (onGoHome) onGoHome();
    } else {
      back();
    }
  };



  // Алхам бүрийн бөглөлт хангалттай эсэх

  const stepValid = (n) => {

    // Gender is deliberately NOT required: it is a discrimination-sensitive
    // attribute, is never used in match scoring, and employers do not need it
    // to assess suitability for a role.
    if (n === 1) return f.name && f.age && f.category && f.location && f.phone;

    if (n === 2) return f.about.trim().length > 10;

    if (n === 3) return f.experience.some((e) => e.role && e.org);

    if (n === 4) return f.education.some((e) => e.degree && e.school);

    if (n === 5) return f.skills.length >= 1;

    if (n === 6) return !!f.videoMode;

    if (n === 7) return true; // сертификат заавал биш

    if (n === 8) return f.salary && f.availableFrom;

    if (n === 9) return !!f.skillTestCompleted;

    return false;

  };



  const next = () => {

    if (!stepValid(step)) {
      const msgs = [
        "Нэр, нас, мэргэжил, байршил, утасны дугаараа бөглөнө үү",
        "Өөрийнхөө тухай 10-аас дээш үсэгтэй тайлбар бичнэ үү",
        "Хамгийн багадаа нэг ажлын туршлага нэмнэ үү",
        "Боловсролын мэдээлэлээ нэмнэ үү",
        "Хамгийн багадаа нэг ур чадвараа сонгоно уу",
        "Видео горимоо сонгоно уу",
        "",
        "Хүссэн цалин болон ажлын нөхцөлөө бөглөнө үү",
        "Тестийн бүх асуултад хариулна уу",
      ];
      flash(msgs[step - 1] || "Энэ алхмыг бөглөнө үү");
      return;
    }

    if (passportEditMode) { returnToPassport(); flash("Хадгалагдлаа ✓"); return; }

    if (step < TOTAL) setStep(step + 1);

    else { setPublished(true); onRegister?.(f); }

  };

  const back = () => { if (step > 1) setStep(step - 1); };

  // Passport дутуу оноо → зөвхөн тухайн алхмыг засварлах горимоор нээнэ (шинэ CV үүсгэхгүй)
  const openPassportEdit = (targetStep, focusField = null) => {
    setPassportEditMode(true);
    setPassportFocusField(focusField);
    setPublished(false);
    setStep(targetStep);
  };

  const handlePassportAction = (action) => {
    switch (action) {
      case "verify-phone":  setVerifySheet("phone"); break;
      case "verify-id":     setVerifySheet("id");    break;
      case "verify-skill":  setVerifySheet("skill"); break;
      case "add-photo":     openPassportEdit(1, "photo");    break;
      case "add-email":     openPassportEdit(1, "email");    break;
      case "edit-category": openPassportEdit(1, "category"); break;
      case "edit-step-2":   openPassportEdit(2); break;
      case "edit-step-3":   openPassportEdit(3); break;
      case "edit-step-4":   openPassportEdit(4); break;
      case "edit-step-5":   openPassportEdit(5); break;
      case "add-video":     openPassportEdit(6); break;
      case "edit-step-7":   openPassportEdit(7); break;
      case "add-cv":        openPassportEdit(7, "cv"); break;
      case "edit-step-8":   openPassportEdit(8); break;
      case "skill-test":    openPassportEdit(9); break;
      default:              flash("Энэ хэсэг одоогоор засварлах боломжгүй байна."); break;
    }
  };

  // ── Нийтлэгдсэн профайлын dashboard ──

  if (published) {

    const verifyItems = [

      { key: "phone", icon: ShieldCheck, label: "Утас баталгаажуулах", sub: "OTP код илгээнэ", color: "#3DDC97" },

      { key: "id", icon: Contact, label: "Иргэний үнэмлэх", sub: "Зураг upload хийх", color: "#4FA3FF" },

      { key: "skill", icon: BadgeCheck, label: "Ур чадвар тест", sub: "5 асуулт · 60% тэнцэх", color: "#FFD23F" },

    ];

    const verifiedCount = Object.values(verified).filter(Boolean).length;



    return (

      <div className="app">

        <Style />

        <header className="topbar topbar--solid">

          <BrandLogo size={34} />

          <button className="topbar__role" onClick={onSwitchRole}>Ажил олгогч →</button>

        </header>

        {/* Beta notice */}
        <div style={{ background: "rgba(255,107,53,0.10)", borderBottom: "1px solid rgba(255,107,53,0.18)", padding: "5px 16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 500, textAlign: "center" }}>
            {DEMO_MODE ? (lang === "en" ? "Demo mode — sample data, stored only on this device." : lang === "ko" ? "데모 모드 — 샘플 데이터, 이 기기에만 저장됩니다." : "Демо горим — жишээ өгөгдөл, зөвхөн энэ төхөөрөмжид хадгалагдана.") : (lang === "en" ? "Beta version." : lang === "ko" ? "베타 버전." : "Туршилтын хувилбар.")}
          </span>
        </div>

        <main className="panel panel--seeker">

          <div className="seeker">

            <div className="seeker__live">

              <CheckCircle2 size={18} /> Таны профайл нийтлэгдлээ! Ажил олгогчид одоо таныг харж байна.

            </div>

            <div className="seeker__hero" style={{ marginTop: 18 }}>

              {SUPABASE_CONFIGURED ? (
                <label style={{ cursor: "pointer", position: "relative", display: "inline-block", flexShrink: 0 }}>
                  {f.avatarPath
                    ? <img src={getPublicUrl({ bucket: "avatars", path: f.avatarPath })} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
                    : <Avatar c={{ name: f.name, category: f.category }} size={64} />}
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    try { const { path } = await uploadFile({ bucket: "avatars", file }); setF((p) => ({ ...p, avatarPath: path })); flash?.("Зураг хадгалагдлаа ✓"); } catch { flash?.("Зураг ачаалж чадсангүй"); }
                  }} />
                  <span style={{ position: "absolute", right: -2, bottom: -2, width: 22, height: 22, borderRadius: "50%", background: "#FF6B35", color: "#fff", fontSize: 12, display: "grid", placeItems: "center", border: "2px solid #141310" }}>✎</span>
                </label>
              ) : (
                <Avatar c={{ name: f.name, category: f.category }} size={64} />
              )}

              <div>

                <h1>{f.name} <span style={{ color: "var(--dim)", fontWeight: 400 }}>· {f.age}</span></h1>

                <span>{f.category} · {f.location}</span>

              </div>

            </div>



            {/* ── Баталгаажуулалтын хэсэг ── */}

            <div style={{ margin: "16px 0", background: verifiedCount === 3 ? "linear-gradient(135deg,rgba(61,220,151,0.12),rgba(61,220,151,0.05))" : "rgba(255,255,255,0.04)", border: `1px solid ${verifiedCount === 3 ? "rgba(61,220,151,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius: 16, padding: "16px" }}>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>

                <span style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>

                  <ShieldCheck size={15} color="#3DDC97" /> Итгэлцлийн баталгаажуулалт

                </span>

                <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, fontSize: 17, color: verifiedCount === 3 ? "#3DDC97" : "#FFD23F" }}>

                  {verifiedCount}/3

                </span>

              </div>

              <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>

                {verifyItems.map((t) => (

                  <div key={t.key} style={{ flex: 1, height: 5, borderRadius: 4, background: verified[t.key] ? t.color : "rgba(255,255,255,0.1)", transition: "background .3s" }} />

                ))}

              </div>

              {verifyItems.map((t) => {

                const Icon = t.icon;

                const done = verified[t.key];

                return (

                  <div key={t.key} onClick={() => !done && setVerifySheet(t.key)}

                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: done ? `${t.color}12` : "rgba(255,255,255,0.05)", border: `1px solid ${done ? t.color + "40" : "rgba(255,255,255,0.08)"}`, marginBottom: 8, cursor: done ? "default" : "pointer", transition: "all .15s" }}>

                    <div style={{ width: 38, height: 38, borderRadius: 10, background: done ? `${t.color}20` : "rgba(255,255,255,0.08)", display: "grid", placeItems: "center", flexShrink: 0 }}>

                      <Icon size={18} color={done ? t.color : "var(--dim)"} />

                    </div>

                    <div style={{ flex: 1 }}>

                      <div style={{ fontSize: 13.5, fontWeight: 600, color: done ? t.color : "var(--ink)" }}>{t.label}</div>

                      <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 1 }}>{done ? "✓ Баталгаажсан" : t.sub}</div>

                    </div>

                    {done

                      ? <Check size={18} color={t.color} />

                      : <ChevronRight size={16} color="var(--dim)" />

                    }

                  </div>

                );

              })}

              {verifiedCount === 3 && (

                <div style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: "#3DDC97", fontWeight: 600 }}>

                  <BadgeCheck size={14} style={{ marginRight: 5, verticalAlign: "middle" }} />

                  Бүрэн баталгаажсан нэр дэвшигч

                </div>

              )}

            </div>

            {seekerTab === "profile" && (
              <PassportCompletionCard f={f} verified={verified} lang={lang} onAction={handlePassportAction} />
            )}

            <div className="spv">

              <div className="spv__row"><Wallet size={15} /><b>{f.salary ? tgr(Number(f.salary)) : "—"}</b><small>Хүсэж буй цалин</small></div>

              <div className="spv__row"><CalendarClock size={15} /><b>{f.availableFrom}</b><small>Ажиллах боломжтой</small></div>

            </div>

            {f.about && <div className="spv__about"><b>Өөрийн тухай</b><p>{f.about}</p></div>}

            {f.skills.length > 0 && (

              <div className="spv__skills"><b>Ур чадвар</b>

                <div className="taglist">{f.skills.map((s) => <span key={s} className="tag">{s}</span>)}</div>

              </div>

            )}

            <button className="seeker__edit" onClick={() => { setPublished(false); setStep(1); }}>

              {t("editProfile")}

            </button>

            {/* Account card */}
            <div style={{ margin: "20px 0 8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 1 }}>
                {lang === "en" ? "Account" : lang === "ko" ? "계정" : "Бүртгэл"}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--dim)" }}>{lang === "en" ? "User type" : lang === "ko" ? "사용자 유형" : "Хэрэглэгчийн төрөл"}</span>
                <span style={{ color: "var(--ink)", fontWeight: 600 }}>{lang === "en" ? "Job Seeker" : lang === "ko" ? "구직자" : "Ажил хайгч"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--dim)" }}>{lang === "en" ? "Verification" : lang === "ko" ? "인증" : "Баталгаажуулалт"}</span>
                <span style={{ color: verified.phone ? "#3DDC97" : "var(--dim)", fontWeight: 600 }}>
                  {verified.phone ? (lang === "en" ? "Verified" : lang === "ko" ? "인증됨" : "Баталгаажсан") : (lang === "en" ? "Not verified" : lang === "ko" ? "미인증" : "Баталгаажаагүй")}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--dim)" }}>Version</span>
                <span style={{ color: "#FF6B35", fontWeight: 700, fontSize: 11 }}>Beta</span>
              </div>
              <LegalLinks lang={lang} />
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  style={{ width: "100%", padding: "10px 0", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 10, color: "#FF5050", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
                >
                  {lang === "en" ? "Logout" : lang === "ko" ? "로그아웃" : "Гарах"}
                </button>
                {/* Data export — GDPR Art. 20 / Play data-portability */}
                <button
                  onClick={exportMyData}
                  style={{ width: "100%", padding: "10px 0", background: "rgba(79,163,255,0.08)", border: "1px solid rgba(79,163,255,0.25)", borderRadius: 10, color: "#4FA3FF", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  ⬇ {lang === "en" ? "Download my data" : lang === "ko" ? "내 데이터 다운로드" : "Миний өгөгдлийг татах"}
                </button>

                {/* Account deletion — required by Google Play & GDPR Art. 17 */}
                <button
                  onClick={() => setShowDeleteAccount(true)}
                  style={{ width: "100%", padding: "10px 0", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.28)", borderRadius: 10, color: "#FF5050", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  🗑 {lang === "en" ? "Delete my account" : lang === "ko" ? "계정 삭제" : "Бүртгэлээ устгах"}
                </button>

                <button
                  onClick={() => setShowResetConfirm(true)}
                  style={{ width: "100%", padding: "8px 0", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "var(--dim)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
                >
                  {lang === "en" ? "Reset Demo Data" : lang === "ko" ? "데모 데이터 초기화" : "Демо өгөгдөл устгах"}
                </button>
              </div>
            </div>

            {/* Delete account confirmation */}
            {showDeleteAccount && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 220, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                <div style={{ background: "var(--bg-2)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 340, border: "1px solid rgba(255,80,80,0.25)" }}>
                  <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 10, color: "#FF5050" }}>
                    {lang === "en" ? "Delete account?" : lang === "ko" ? "계정을 삭제할까요?" : "Бүртгэлээ устгах уу?"}
                  </div>
                  <div style={{ color: "var(--dim)", fontSize: 13.5, marginBottom: 10, lineHeight: 1.55 }}>
                    {lang === "en"
                      ? "This permanently erases your profile, video CV, CV file, certificates, verifications and skill-test results from this device. It cannot be undone."
                      : lang === "ko"
                      ? "프로필, 영상 CV, 이력서, 자격증, 인증 및 테스트 결과가 이 기기에서 영구 삭제됩니다. 되돌릴 수 없습니다."
                      : "Таны профайл, видео CV, CV файл, гэрчилгээ, баталгаажуулалт болон тестийн дүн энэ төхөөрөмжөөс бүрмөсөн устана. Буцаах боломжгүй."}
                  </div>
                  <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", marginBottom: 18, lineHeight: 1.5 }}>
                    {lang === "en"
                      ? "Tip: download a copy of your data first."
                      : lang === "ko" ? "먼저 데이터를 내려받는 것을 권장합니다."
                      : "Зөвлөмж: эхлээд өгөгдлөө татаж авахыг зөвлөж байна."}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setShowDeleteAccount(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "var(--ink)", fontWeight: 600, cursor: "pointer" }}>
                      {lang === "en" ? "Cancel" : lang === "ko" ? "취소" : "Болих"}
                    </button>
                    <button onClick={deleteMyAccount} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#FF5050", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                      {lang === "en" ? "Delete" : lang === "ko" ? "삭제" : "Устгах"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Logout confirmation overlay */}
            {showLogoutConfirm && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                <div style={{ background: "var(--bg-2)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 320, border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 10 }}>
                    {lang === "en" ? "Logout" : lang === "ko" ? "로그아웃" : "Гарах"}
                  </div>
                  <div style={{ color: "var(--dim)", fontSize: 14, marginBottom: 22, lineHeight: 1.5 }}>
                    {lang === "en" ? "Are you sure you want to logout?" : lang === "ko" ? "로그아웃하시겠습니까?" : "Та гарахдаа итгэлтэй байна уу?"}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => setShowLogoutConfirm(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "var(--ink)", fontWeight: 600, cursor: "pointer" }}>
                      {lang === "en" ? "Cancel" : lang === "ko" ? "취소" : "Болих"}
                    </button>
                    <button onClick={() => { setShowLogoutConfirm(false); if (onLogout) onLogout(); else if (onGoHome) onGoHome(); }} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#FF5050", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                      {lang === "en" ? "Logout" : lang === "ko" ? "로그아웃" : "Гарах"}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

        </main>



        {/* ── Leave registration confirm ── */}
        {showLeaveConfirm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ background: "var(--bg-2)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 320, border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
                {lang === "en" ? "Leave registration?" : lang === "ko" ? "등록을 취소하시겠습니까?" : "Бүртгэлийг орхих уу?"}
              </div>
              <div style={{ color: "var(--dim)", fontSize: 14, marginBottom: 22, lineHeight: 1.5 }}>
                {lang === "en" ? "Your progress may not be saved." : lang === "ko" ? "입력한 정보가 저장되지 않을 수 있습니다." : "Оруулсан мэдээлэл хадгалагдахгүй байж магадгүй."}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowLeaveConfirm(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "var(--ink)", fontWeight: 600, cursor: "pointer" }}>
                  {lang === "en" ? "Stay" : lang === "ko" ? "머물기" : "Үргэлжлүүлэх"}
                </button>
                <button onClick={() => { setShowLeaveConfirm(false); if (onGoHome) onGoHome(); }} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#FF5050", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                  {lang === "en" ? "Leave" : lang === "ko" ? "나가기" : "Гарах"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Reset demo data confirm ── */}
        {showResetConfirm && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div style={{ background: "var(--bg-2)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 320, border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
                {lang === "en" ? "Reset all demo data?" : lang === "ko" ? "데모 데이터 초기화?" : "Демо өгөгдлийг устгах уу?"}
              </div>
              <div style={{ color: "var(--dim)", fontSize: 14, marginBottom: 22, lineHeight: 1.5 }}>
                {lang === "en" ? "This cannot be undone." : lang === "ko" ? "이 작업은 되돌릴 수 없습니다." : "Буцаах боломжгүй."}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowResetConfirm(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "var(--ink)", fontWeight: 600, cursor: "pointer" }}>
                  {lang === "en" ? "Cancel" : lang === "ko" ? "취소" : "Болих"}
                </button>
                <button onClick={() => { setShowResetConfirm(false); localStorage.clear(); window.location.reload(); }} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#FF5050", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                  {lang === "en" ? "Reset" : lang === "ko" ? "초기화" : "Устгах"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Verification sheets ── */}

        {verifySheet === "phone" && (

          <PhoneVerifySheet phone={f.phone} onClose={() => setVerifySheet(null)}

            onVerified={() => setVerified((v) => ({ ...v, phone: true }))} />

        )}

        {verifySheet === "id" && (

          <IdVerifySheet onClose={() => setVerifySheet(null)}

            onVerified={() => setVerified((v) => ({ ...v, id: true }))} />

        )}

        {verifySheet === "skill" && (

          <SkillVerifySheet category={f.category} onClose={() => setVerifySheet(null)}

            onVerified={() => setVerified((v) => ({ ...v, skill: true }))} />

        )}

        {seekerTab === "jobs" && <JobFeed onBack={() => setSeekerTab("profile")} />}

        {seekerTab === "offers" && (

          <div style={{ position: "absolute", inset: 0, top: "calc(68px + max(12px, var(--sat)))", bottom: "var(--tabh)", overflowY: "auto", background: "var(--bg)" }}>

            <SeekerOffers subscribed={seekerSubscribed} onSubscribe={() => setSeekerSubscribed(true)} />

          </div>

        )}

        {seekerTab === "ai" && (

          <div style={{ position: "absolute", inset: 0, top: "calc(68px + max(12px, var(--sat)))", bottom: "var(--tabh)", background: "var(--bg)", display: "flex", flexDirection: "column" }}>

            <AICareerCoach />

          </div>

        )}

        {seekerTab === "finance" && (

          <div style={{ position: "absolute", inset: 0, top: "calc(68px + max(12px, var(--sat)))", bottom: "var(--tabh)", overflowY: "auto", background: "var(--bg)" }}>

            <SeekerFinancePanel />

          </div>

        )}

        <nav className="tabbar" aria-label="Tabs">

          <button className={`tabbar__btn ${seekerTab === "profile" ? "is-on" : ""}`} onClick={() => setSeekerTab("profile")}><User size={20} /><span>{t("tabProfile")}</span></button>

          <button className={`tabbar__btn ${seekerTab === "jobs" ? "is-on" : ""}`} onClick={() => setSeekerTab("jobs")}><Briefcase size={20} /><span>{t("tabJobs")}</span></button>

          <button className={`tabbar__btn ${seekerTab === "offers" ? "is-on" : ""}`} onClick={() => setSeekerTab("offers")} style={{ position: "relative" }}>

            <Send size={20} />

            <span>{t("tabOffers")}</span>

            {/* unread badge */}

            {MOCK_OFFERS.length > 0 && <span style={{

              position: "absolute", top: 4, right: "calc(50% - 18px)",

              background: "#FF6B35", color: "#fff", fontSize: 9, fontWeight: 900,

              borderRadius: "50%", width: 16, height: 16, display: "grid", placeItems: "center",

            }}>{MOCK_OFFERS.length}</span>}

          </button>

          <button className={`tabbar__btn ${seekerTab === "ai" ? "is-on" : ""}`} onClick={() => setSeekerTab("ai")} style={{ position: "relative" }}>

            <span style={{ fontSize: 18 }}>🤖</span>

            <span>{lang === "en" ? "AI Coach" : lang === "ko" ? "AI코치" : "AI"}</span>

            <span style={{ position: "absolute", top: 4, right: "calc(50% - 20px)", background: "linear-gradient(135deg,#4FA3FF,#B488FF)", color: "#fff", fontSize: 8, fontWeight: 900, borderRadius: 6, padding: "1px 4px" }}>NEW</span>

          </button>

          <button className={`tabbar__btn ${seekerTab === "finance" ? "is-on" : ""}`} onClick={() => setSeekerTab("finance")}><Wallet size={20} /><span>{t("tabFinance")}</span></button>

        </nav>

      </div>

    );

  }



  // ── Wizard ──

  const titles = [t("step1"), t("step2"), t("step3"), t("step4"),

    t("step5"), t("step6"), t("step7"), t("step8"), t("step9")];



  return (

    <div className="app">

      <Style />

      <header className="topbar topbar--solid">

        <button className="wiz__back" onClick={handleWizardBack} aria-label="Back">

          <ChevronLeft size={22} />

        </button>

        {passportEditMode ? (
          <button onClick={returnToPassport} style={{ background: "rgba(255,107,53,0.12)", border: "1px solid rgba(255,107,53,0.35)", borderRadius: 10, padding: "6px 12px", color: "#FF6B35", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
            ← Passport руу буцах
          </button>
        ) : (
          <div className="wiz__htitle">{titles[step - 1]}</div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

          {SUPABASE_CONFIGURED && <span style={{ marginRight: 6, display: "inline-flex" }}><NotificationBell lang={lang} /></span>}

          <button onClick={toggleTheme} aria-label="Theme" style={{
            width: 26, height: 26, borderRadius: 8, border: "1px solid var(--hair-2)",
            background: "var(--surface)", cursor: "pointer", fontSize: 12, marginRight: 6,
          }}>{theme === "dark" ? "☀️" : "🌙"}</button>

          <button onClick={toggleLang} style={{

            padding: "3px 9px", borderRadius: 8, border: "1px solid var(--hair-2)",

            background: "var(--surface)", color: "var(--ink)",

            fontSize: 11, fontWeight: 700, cursor: "pointer",

          }}>{lang === "mn" ? "EN" : lang === "en" ? "한국어" : "МН"}</button>

          <span className="wiz__count">{step}/{TOTAL}</span>

        </div>

      </header>



      {/* прогресс */}

      <div className="wiz__bar">

        <span style={{ width: `${(step / TOTAL) * 100}%` }} />

      </div>



      <main className="panel panel--wiz">

        <div className="wiz">

          {/* Алхам 1: Хувийн мэдээлэл */}

          {step === 1 && (

            <div className="wiz__fields">

              <Field label="Профайл зураг" icon={<User size={15} />}>
                <div id="wiz-photo" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {f.photo
                    ? <img src={f.photo} alt="" style={{ width: 62, height: 62, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,107,53,0.5)" }} />
                    : <div style={{ width: 62, height: 62, borderRadius: "50%", background: "rgba(255,255,255,0.07)", border: "1px dashed rgba(255,255,255,0.25)", display: "grid", placeItems: "center", color: "var(--dim)", fontSize: 22 }}>👤</div>}
                  <button onClick={() => photoInputRef.current?.click()} style={{ padding: "9px 16px", borderRadius: 10, border: "1px solid rgba(255,107,53,0.4)", background: "rgba(255,107,53,0.1)", color: "#FF6B35", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    {f.photo ? "Зураг солих" : "Зураг нэмэх"}
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" onChange={onPhotoPick} style={{ display: "none" }} />
                </div>
              </Field>

              <Field label="Нэр" icon={<User size={15} />}>

                <input value={f.name} onChange={(e) => upd({ name: e.target.value })} placeholder="Таны бүтэн нэр" />

              </Field>

              <div className="wiz__two">

                <Field label="Нас">

                  <input type="number" value={f.age} onChange={(e) => upd({ age: e.target.value })} placeholder="25" />

                </Field>

                <Field label="Хүйс (заавал бус)">

                  <div className="pills">

                    {GENDERS.map((g) => (

                      <button key={g} className={`pill ${f.gender === g ? "is-on" : ""}`} onClick={() => upd({ gender: g })}>{g}</button>

                    ))}

                  </div>

                </Field>

              </div>

              <Field label="Мэргэжил" icon={<Briefcase size={15} />}>

                <div id="wiz-category"><DrumCategoryPicker value={f.category} onChange={(v) => upd({ category: v })} /></div>

              </Field>

              <Field label="Байршил" icon={<MapPin size={15} />}>

                <DrumPicker items={LOCATIONS} value={f.location} onChange={(v) => upd({ location: v })} height={220} itemH={46} />

              </Field>

              <Field label="Утас" icon={<Phone size={15} />}>

                <input type="tel" value={f.phone} onChange={(e) => upd({ phone: e.target.value })} placeholder="9911-2233" />

              </Field>

              <Field label="И-мэйл" icon={<Mail size={15} />}>

                <input id="wiz-email" type="email" value={f.email} onChange={(e) => upd({ email: e.target.value })} placeholder="name@email.com" />

              </Field>

            </div>

          )}



          {/* Алхам 2: Өөрийн тухай */}

          {step === 2 && (

            <div className="wiz__fields">

              <Field label="Өөрийгөө танилцуулна уу" icon={<FileText size={15} />}>

                <textarea rows={7} value={f.about} onChange={(e) => upd({ about: e.target.value })}

                  placeholder="Жишээ: Би 8 жилийн туршлагатай гагнуурчин. Үйлдвэр болон барилгын төслүүдэд ажилласан. Багаар ажиллах чадвар сайн, аюулгүй ажиллагааг чанд баримталдаг..." />

              </Field>

              <span className="wiz__hint">{f.about.length} тэмдэгт. Ажил олгогч таныг ойлгоход тусална.</span>

            </div>

          )}



          {/* Алхам 3: Ажлын туршлага */}

          {step === 3 && (

            <div className="wiz__fields">

              {f.experience.map((e, i) => (

                <div className="rowcard" key={i}>

                  {f.experience.length > 1 && (

                    <button className="rowcard__del" onClick={() => delRow("experience", i)} aria-label="Устгах"><Trash2 size={16} /></button>

                  )}

                  <Field label="Албан тушаал"><input value={e.role} onChange={(ev) => updRow("experience", i, { role: ev.target.value })} placeholder="Ахлах гагнуурчин" /></Field>

                  <Field label="Байгууллага"><input value={e.org} onChange={(ev) => updRow("experience", i, { org: ev.target.value })} placeholder="МонголБарилга ХХК" /></Field>

                  <Field label="Хугацаа"><input value={e.period} onChange={(ev) => updRow("experience", i, { period: ev.target.value })} placeholder="2019–2024" /></Field>

                </div>

              ))}

              <button className="wiz__add" onClick={() => addRow("experience", { role: "", org: "", period: "" })}>

                <Plus size={16} /> Туршлага нэмэх

              </button>

            </div>

          )}



          {/* Алхам 4: Боловсрол */}

          {step === 4 && (

            <div className="wiz__fields">

              {f.education.map((e, i) => (

                <div className="rowcard" key={i}>

                  {f.education.length > 1 && (

                    <button className="rowcard__del" onClick={() => delRow("education", i)} aria-label="Устгах"><Trash2 size={16} /></button>

                  )}

                  <Field label="Мэргэжил / зэрэг"><input value={e.degree} onChange={(ev) => updRow("education", i, { degree: ev.target.value })} placeholder="Гагнуурын техникч" /></Field>

                  <Field label="Сургууль"><input value={e.school} onChange={(ev) => updRow("education", i, { school: ev.target.value })} placeholder="ПТК-12, Улаанбаатар" /></Field>

                  <Field label="Хугацаа"><input value={e.period} onChange={(ev) => updRow("education", i, { period: ev.target.value })} placeholder="2010–2012" /></Field>

                </div>

              ))}

              <button className="wiz__add" onClick={() => addRow("education", { degree: "", school: "", period: "" })}>

                <Plus size={16} /> Боловсрол нэмэх

              </button>

            </div>

          )}



          {/* Алхам 5: Ур чадвар */}

          {step === 5 && (

            <SkillDrumStep

              skills={f.skills}

              onToggle={toggleSkill}

            />

          )}



          {/* Алхам 6: Видео CV */}

          {step === 6 && (

            <div className="wiz__fields">

              <span className="wiz__hint">30–60 секундын танилцуулга бичлэг — ажил олгогчид таныг хамгийн түрүүнд танина.</span>

              <button className={`vidopt ${f.videoMode === "record" ? "is-on" : ""}`} onClick={() => cameraInputRef.current?.click()}>

                <span className="vidopt__icon" style={{ background: "rgba(255,107,53,.16)", color: "#FF6B35" }}><Video size={24} /></span>

                <span className="vidopt__body"><b>Бичлэг хийх</b><small>{f.videoMode === "record" ? (f.videoFileName || "Бичлэг хийгдлээ ✓") : "Утсаараа шууд танилцуулга бичих"}</small></span>

                {f.videoMode === "record" && <Check size={18} style={{ color: "#FF6B35" }} />}

              </button>

              <input
                ref={cameraInputRef}
                type="file"
                accept="video/*"
                capture="user"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const chk = checkUpload(file, "video", lang);
                  if (!chk.ok) { flash(chk.error); e.target.value = ""; return; }
                  const url = URL.createObjectURL(file);
                  upd({ videoMode: "record", videoFileName: file.name, videoFile: url });
                  if (SUPABASE_CONFIGURED) uploadFile({ bucket: "videos", file }).then(({ path }) => upd({ videoPath: path })).catch(() => {});
                  flash("Бичлэг хадгалагдлаа ✓");
                  e.target.value = "";
                }}
              />

              <button className={`vidopt ${f.videoMode === "upload" ? "is-on" : ""}`} onClick={() => videoInputRef.current?.click()}>

                <span className="vidopt__icon" style={{ background: "rgba(79,163,255,.16)", color: "#4FA3FF" }}><Upload size={24} /></span>

                <span className="vidopt__body"><b>Видео upload хийх</b><small>{f.videoFileName || "Бэлэн бичлэгээ оруулах"}</small></span>

                {f.videoMode === "upload" && <Check size={18} style={{ color: "#4FA3FF" }} />}

              </button>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const chk = checkUpload(file, "video", lang);
                  if (!chk.ok) { flash(chk.error); e.target.value = ""; return; }
                  const url = URL.createObjectURL(file);
                  upd({ videoMode: "upload", videoFileName: file.name, videoFile: url });
                  if (SUPABASE_CONFIGURED) uploadFile({ bucket: "videos", file }).then(({ path }) => upd({ videoPath: path })).catch(() => {});
                  flash("Видео нэмэгдлээ ✓");
                  e.target.value = "";
                }}
              />

            </div>

          )}



          {/* Алхам 7: Сертификат ба CV */}

          {step === 7 && (

            <div className="wiz__fields">

              <span className="wiz__hint">Сертификат, диплом, CV PDF нэмснээр итгэлцэл нэмэгдэнэ (заавал биш).</span>

              <button className="upbox" onClick={() => certInputRef.current?.click()}>

                <Award size={22} /><b>Сертификат байршуулах</b><small>JPG, PNG, PDF</small>

              </button>

              <input
                ref={certInputRef}
                type="file"
                accept="image/*,.pdf,application/pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const chk = checkUpload(file, "doc", lang);
                  if (!chk.ok) { flash(chk.error); e.target.value = ""; return; }
                  upd({ certs: [...f.certs, file.name] });
                  flash("Сертификат нэмэгдлээ ✓");
                  e.target.value = "";
                }}
              />

              {f.certs.length > 0 && (

                <div className="uplist">

                  {f.certs.map((c, i) => (

                    <span key={i} className="upitem"><Award size={14} /> {c}

                      <button onClick={() => delRow("certs", i)} aria-label="Устгах"><X size={13} /></button>

                    </span>

                  ))}

                </div>

              )}

              <button id="wiz-cv" className="upbox" onClick={() => cvInputRef.current?.click()}>

                <FileText size={22} /><b>CV PDF байршуулах</b><small>PDF файл</small>

              </button>

              <input
                ref={cvInputRef}
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const chk = checkUpload(file, "doc", lang);
                  if (!chk.ok) { flash(chk.error); e.target.value = ""; return; }
                  const reader = new FileReader();
                  reader.onload = () => upd({ cvFile: file.name, cvFileData: reader.result });
                  reader.readAsDataURL(file);
                  if (SUPABASE_CONFIGURED) uploadFile({ bucket: "cv-pdfs", file }).then(({ path }) => upd({ cvPath: path })).catch(() => {});
                  flash("CV нэмэгдлээ ✓");
                  e.target.value = "";
                }}
              />

              {f.cvFile && <span className="upitem upitem--solo"><FileText size={14} /> {f.cvFile}

                <button onClick={() => upd({ cvFile: "", cvFileData: "" })} aria-label="Устгах"><X size={13} /></button></span>}

            </div>

          )}



          {/* Алхам 8: Цалин ба боломж */}

          {step === 8 && (

            <div className="wiz__fields">

              <Field label="Хүсэж буй сарын цалин" icon={<Wallet size={15} />}>

                <SalaryDrumPicker

                  value={f.salary}

                  onChange={(v) => upd({ salary: v })}

                />

              </Field>

              <Field label="Ажиллах боломжтой хугацаа" icon={<CalendarClock size={15} />}>

                <DrumPicker

                  items={AVAIL_OPTIONS}

                  value={f.availableFrom || AVAIL_OPTIONS[0]}

                  onChange={(v) => upd({ availableFrom: v })}

                  height={180}

                  itemH={44}

                />

              </Field>

            </div>

          )}

          {/* Алхам 9: Ур чадварын тест */}

          {step === 9 && (
            <SkillTestStep f={f} upd={upd} />
          )}

        </div>

      </main>



      {/* доод үйлдэл */}

      <div className="wiz__actions">

        {!passportEditMode && step > 1 && <button className="wiz__btn wiz__btn--ghost" onClick={back}>Буцах</button>}

        <button className="wiz__btn" onClick={next} style={{ background: stepValid(step) ? "#FF6B35" : "rgba(255,107,53,.4)" }}>

          {passportEditMode ? <>Хадгалах <Check size={16} /></> : step === TOTAL ? <>{t("publish")} <Send size={16} /></> : <>{t("next")} <ChevronRight size={16} /></>}

        </button>

      </div>

    </div>

  );

}



// Формын талбар туслах

function Field({ label, icon, children }) {

  return (

    <label className="field">

      <span className="field__label">{icon} {label}</span>

      {children}

    </label>

  );

}



/* ── Ажлын санал (ажил хайгч) ────────────────────────── */

const MOCK_OFFERS = [

  { id: 101, company: "Монголын Ган ХХК", logo: "МГ", role: "Гагнуурчин", salary: "2,200,000–2,800,000₮", location: "Улаанбаатар – Хан-Уул", type: "Бүтэн цаг", color: "#FF6B35", sentAt: "2 цагийн өмнө" },

  { id: 102, company: "BuildPro Construction", logo: "BP", role: "Ахлах гагнуурчин", salary: "2,800,000–3,500,000₮", location: "Улаанбаатар – Баянзүрх", type: "Гэрээт", color: "#4FA3FF", sentAt: "Өчигдөр" },

  { id: 103, company: "Эрдэнэт Үйлдвэр", logo: "ЭҮ", role: "Тусгай гагнуурчин", salary: "3,000,000–4,000,000₮", location: "Эрдэнэт хот", type: "Бүтэн цаг", color: "#3DDC97", sentAt: "2 хоногийн өмнө" },

  { id: 104, company: "Asia Mining Corp", logo: "AM", role: "Гагнуур слесарь", salary: "3,500,000–4,500,000₮", location: "Өмнөговь аймаг", type: "Rotation", color: "#FFD23F", sentAt: "3 хоногийн өмнө" },

  { id: 105, company: "Дархан Металл ХХК", logo: "ДМ", role: "Гагнуурчин", salary: "1,900,000–2,400,000₮", location: "Дархан хот", type: "Бүтэн цаг", color: "#B488FF", sentAt: "Долоо хоногийн өмнө" },

];




// ── AI Workplace Insights: mock anonymous feedback data ──
const MOCK_WORKPLACE_DATA = {
  "Монголын Ган ХХК": {
    responses: 34,
    score: 4.2,
    retention: 81,
    avgDuration: 2.1,
    riskAlert: false,
    reasons: [
      { label: "Better Opportunity", pct: 29 },
      { label: "Salary", pct: 24 },
      { label: "Career Growth", pct: 18 },
      { label: "Overtime", pct: 12 },
      { label: "Other", pct: 17 },
    ],
    strengths: ["Тогтвортой ажлын байр", "Нийгмийн даатгал", "Орон сууцны тусламж"],
    improvements: ["Цалин өсгөх", "Илүү цаг бууруулах", "Ажилчдын сургалт нэмэх"],
    aiSummary: "Ажилчид компанийн тогтвортой байдал болон орон сууцны дэмжлэгийг үнэлдэг. Явах гол шалтгаан нь илүү сайн боломж хайх явдал бөгөөд энэ нь салбарын дунджтай нийцэж байна. Сүүлийн ажилчдын эргэлт ердийн хэмжээнд байна.",
    trendMonths: [72, 78, 75, 80, 81, 79, 81],
    industryRetention: 74,
    aiSuggestions: ["Цалингийн өрсөлдөх чадварыг нэмэгдүүлэх", "Илүү цагийн дүрмийг шинэчлэх", "Ажилтны мэргэжлийн хөгжлийн сангийг нэмэгдүүлэх"],
  },
  "BuildPro Construction": {
    responses: 21,
    score: 3.8,
    retention: 67,
    avgDuration: 1.4,
    riskAlert: true,
    reasons: [
      { label: "Management", pct: 31 },
      { label: "Overtime", pct: 27 },
      { label: "Salary", pct: 19 },
      { label: "Safety", pct: 12 },
      { label: "Other", pct: 11 },
    ],
    strengths: ["Цалин тогтмол төлдөг", "Туршлага олох боломж"],
    improvements: ["Удирдлагын харилцааг сайжруулах", "Аюулгүй байдлын сургалт", "Илүү цагийг бууруулах"],
    aiSummary: "Ажилчид цалин тогтмол төлдгийг үнэлдэг. Гэсэн хэдий ч удирдлагын харилцаа болон илүү цаг нь гол санаа зовоох асуудал болж байна. Сүүлийн ажилчдын эргэлт дундажаас өндөр байна.",
    trendMonths: [80, 75, 70, 65, 63, 67, 67],
    industryRetention: 74,
    aiSuggestions: ["Дунд шатны удирдлагад сургалт явуулах", "Илүү цагийн бодлогыг хянах", "Аюулгүй байдлын хяналтыг чангатгах", "Нэн тэргүүний ажилд орох дэмжлэг нэмэгдүүлэх"],
  },
  "Эрдэнэт Үйлдвэр": {
    responses: 58,
    score: 4.5,
    retention: 89,
    avgDuration: 3.7,
    riskAlert: false,
    reasons: [
      { label: "Contract Ended", pct: 35 },
      { label: "Personal Reason", pct: 22 },
      { label: "Better Opportunity", pct: 20 },
      { label: "Location", pct: 14 },
      { label: "Other", pct: 9 },
    ],
    strengths: ["Дэлхийн жишгийн цалин", "Ажилтны хөгжлийн хөтөлбөр", "Аюулгүй ажлын орчин", "Тогтвортой ажлын байр"],
    improvements: ["Байршлын хүрэлцээ (хот хол)", "Гэр бүлийн ойр байх боломж"],
    aiSummary: "Эрдэнэт Үйлдвэр нь ажилтнуудын сэтгэл ханамж, хадгалалтын хувьд салбарт тэргүүлж байна. Ажилчид цалин, аюулгүй байдал, хөгжлийн боломжийг маш өндрөөр үнэлдэг. Ихэнх гарсан ажилтнууд гэрээ дуусгавар болсон эсвэл хувийн шалтгаантай байна.",
    trendMonths: [86, 87, 88, 89, 90, 88, 89],
    industryRetention: 74,
    aiSuggestions: ["Амьдрах нөхцөлийн дэмжлэгийг хадгалах", "Алслагдсан байршлын урамшуулал нэмэх"],
  },
  "Asia Mining Corp": {
    responses: 43,
    score: 4.0,
    retention: 76,
    avgDuration: 2.3,
    riskAlert: false,
    reasons: [
      { label: "Better Opportunity", pct: 28 },
      { label: "Accommodation", pct: 21 },
      { label: "Location", pct: 19 },
      { label: "Salary", pct: 16 },
      { label: "Other", pct: 16 },
    ],
    strengths: ["Өндөр цалин", "Rotation хуваарь", "Хоол, байртай"],
    improvements: ["Байрны нөхцөл сайжруулах", "Интернэт, харилцаа холбоо нэмэгдүүлэх", "Чөлөөний тоог нэмэх"],
    aiSummary: "Ажилчид өндөр цалин болон rotation хуваарийг үнэлдэг. Алслагдсан байршил, байрны нөхцөл нь сайжруулах хэрэгтэй гол чиглэл байна. Ажилчдын эргэлт салбарын дунджтай нийцэж байна.",
    trendMonths: [74, 73, 75, 76, 77, 75, 76],
    industryRetention: 74,
    aiSuggestions: ["Байрны нөхцөл болон хоолны чанарыг сайжруулах", "Алслагдсан байршлын урамшуулал нэмэх", "Интернэт холболт сайжруулах"],
  },
  "Дархан Металл ХХК": {
    responses: 12,
    score: 3.5,
    retention: 59,
    avgDuration: 1.1,
    riskAlert: true,
    reasons: [
      { label: "Salary", pct: 38 },
      { label: "Better Opportunity", pct: 25 },
      { label: "Management", pct: 17 },
      { label: "Career Growth", pct: 13 },
      { label: "Other", pct: 7 },
    ],
    strengths: ["Ойр байршил (Дархан хот)"],
    improvements: ["Цалин өрсөлдөх чадварыг нэмэгдүүлэх", "Ажилтнуудын хадгалалтын хөтөлбөр", "Удирдлагын чадавхийг нэмэгдүүлэх", "Ажил мэргэжлийн хөгжлийн зам"],
    aiSummary: "Ажилчид дунджаас доош цалин, хөгжлийн боломжийн хомсдолыг голлон дурдсан байна. Сүүлийн ажилчдын эргэлт нь дундажаас өндөр байна. Шийдвэр гаргах шатанд анхаарал хандуулах нь зүйтэй.",
    trendMonths: [72, 68, 65, 60, 57, 59, 59],
    industryRetention: 74,
    aiSuggestions: ["Цалингийн өрсөлдөх чадварыг яаралтай сайжруулах", "Ажилтны хадгалалтын хөтөлбөр нэвтрүүлэх", "Удирдлагад тусгай сургалт явуулах", "Ажил мэргэжлийн дэвших зам тодорхойлох"],
  },
};

const EXIT_REASONS = [
  "Salary", "Better Opportunity", "Career Growth", "Management",
  "Overtime", "Accommodation", "Food", "Safety",
  "Location", "Contract Ended", "Personal Reason", "Other",
];

const EXIT_REASON_MN = {
  "Salary": "Цалин",
  "Better Opportunity": "Илүү сайн боломж",
  "Career Growth": "Карьерын өсөлт",
  "Management": "Удирдлага",
  "Overtime": "Илүү цаг",
  "Accommodation": "Орон сууц",
  "Food": "Хоол",
  "Safety": "Аюулгүй байдал",
  "Location": "Байршил",
  "Contract Ended": "Гэрээ дуусгавар болсон",
  "Personal Reason": "Хувийн шалтгаан",
  "Other": "Бусад",
};

function getWorkplaceData(company) {
  return MOCK_WORKPLACE_DATA[company] || null;
}

const FREE_OFFER_ACCEPTS = 3;



function SeekerOffers({ subscribed, onSubscribe }) {

  const { t, lang } = useLang();

  const [statuses, setStatuses] = useState({}); // id → "accepted" | "declined"

  const [showPaywall, setShowPaywall] = useState(false);



  const acceptedCount = Object.values(statuses).filter(v => v === "accepted").length;

  const freeLeft = Math.max(0, FREE_OFFER_ACCEPTS - acceptedCount);



  const accept = (id) => {

    if (!subscribed && acceptedCount >= FREE_OFFER_ACCEPTS) {

      setShowPaywall(true);

      return;

    }

    setStatuses(p => ({ ...p, [id]: "accepted" }));

  };

  const [exitSurvey, setExitSurvey] = React.useState(null); // { company }
  const decline = (id) => {
    const offer = MOCK_OFFERS.find(o => o.id === id);
    setStatuses(p => ({ ...p, [id]: "declined" }));
    if (offer) setExitSurvey({ company: offer.company });
  };



  const pending = MOCK_OFFERS.filter(o => !statuses[o.id]);

  const done = MOCK_OFFERS.filter(o => statuses[o.id]);



  return (

    <div style={{ padding: "16px 16px 0", height: "100%", overflowY: "auto" }}>

      {/* Header */}

      <div style={{ marginBottom: 16 }}>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)", margin: 0 }}>{t("offerTitle")}</h2>

        <p style={{ fontSize: 13, color: "var(--dim)", margin: "4px 0 0" }}>{t("offerSub")}</p>

      </div>



      {/* Free counter */}

      {!subscribed && (

        <div style={{

          display: "flex", alignItems: "center", gap: 10,

          background: freeLeft > 0 ? "rgba(61,220,151,0.08)" : "rgba(255,107,53,0.08)",

          border: `1px solid ${freeLeft > 0 ? "rgba(61,220,151,0.25)" : "rgba(255,107,53,0.25)"}`,

          borderRadius: 14, padding: "10px 14px", marginBottom: 16,

        }}>

          <span style={{ fontSize: 22, fontWeight: 900, color: freeLeft > 0 ? "#3DDC97" : "#FF6B35", fontFamily: "'Barlow Condensed',sans-serif" }}>{freeLeft}</span>

          <div>

            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{t("offerFreeLeft")}</div>

            {freeLeft === 0 && <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{t("offerLimitSub")}</div>}

          </div>

          {freeLeft === 0 && (

            <button onClick={() => setShowPaywall(true)} style={{

              marginLeft: "auto", padding: "6px 14px", borderRadius: 10, border: "none",

              background: "linear-gradient(135deg,#FF6B35,#e8542a)", color: "#fff",

              fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap",

            }}>Pro →</button>

          )}

        </div>

      )}



      {/* Pending offers */}

      {pending.length > 0 && (

        <>

          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>

            {lang === "en" ? "Awaiting your response" : "Хариу хүлээж байна"} · {pending.length}

          </div>

          {pending.map(o => (

            <div key={o.id} style={{

              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",

              borderRadius: 18, padding: "16px", marginBottom: 12, position: "relative",

            }}>

              {/* New badge */}

              <div style={{

                position: "absolute", top: 14, right: 14,

                background: `${o.color}22`, border: `1px solid ${o.color}55`,

                borderRadius: 8, padding: "2px 8px",

                fontSize: 10, fontWeight: 800, color: o.color, letterSpacing: 0.5,

              }}>{t("offerNew")}</div>



              {/* Company row */}

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>

                <div style={{

                  width: 46, height: 46, borderRadius: 13, flexShrink: 0,

                  background: `${o.color}22`, border: `2px solid ${o.color}44`,

                  display: "grid", placeItems: "center",

                  fontSize: 13, fontWeight: 900, color: o.color,

                }}>{o.logo}</div>

                <div>

                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>{o.company}</div>

                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 1 }}>{o.sentAt}</div>

                </div>

              </div>



              {/* Role & details */}

              <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ink)", marginBottom: 8 }}>{o.role}</div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>

                <span style={{ fontSize: 12, background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "4px 10px", color: "var(--ink)" }}>💰 {o.salary}</span>

                <span style={{ fontSize: 12, background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "4px 10px", color: "var(--ink)" }}>📍 {o.location}</span>

                <span style={{ fontSize: 12, background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "4px 10px", color: "var(--ink)" }}>⏱ {o.type}</span>

              </div>



              {/* Actions */}

              <div style={{ display: "flex", gap: 10 }}>

                <button onClick={() => decline(o.id)} style={{

                  flex: 1, padding: "11px 0", borderRadius: 12,

                  border: "1.5px solid rgba(255,68,68,0.3)",

                  background: "rgba(255,68,68,0.06)", color: "#ff6b6b",

                  fontSize: 14, fontWeight: 700, cursor: "pointer",

                }}>{t("offerDecline")}</button>

                <button onClick={() => accept(o.id)} style={{

                  flex: 2, padding: "11px 0", borderRadius: 12, border: "none",

                  background: (!subscribed && acceptedCount >= FREE_OFFER_ACCEPTS)

                    ? "rgba(255,107,53,0.15)"

                    : `linear-gradient(135deg,${o.color},${o.color}cc)`,

                  color: (!subscribed && acceptedCount >= FREE_OFFER_ACCEPTS) ? "#FF6B35" : "#fff",

                  fontSize: 14, fontWeight: 800, cursor: "pointer",

                }}>{(!subscribed && acceptedCount >= FREE_OFFER_ACCEPTS) ? "🔒 " + t("offerAccept") : t("offerAccept")}</button>

              </div>

            </div>

          ))}

        </>

      )}



      {/* Done offers */}

      {done.length > 0 && (

        <>

          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", letterSpacing: 1, margin: "16px 0 8px", textTransform: "uppercase" }}>

            {lang === "en" ? "Responded" : "Хариу өгсөн"}

          </div>

          {done.map(o => {

            const st = statuses[o.id];

            return (

              <div key={o.id} style={{

                display: "flex", alignItems: "center", gap: 12,

                background: st === "accepted" ? "rgba(61,220,151,0.06)" : "rgba(255,255,255,0.03)",

                border: `1px solid ${st === "accepted" ? "rgba(61,220,151,0.2)" : "rgba(255,255,255,0.07)"}`,

                borderRadius: 14, padding: "12px 14px", marginBottom: 8, opacity: st === "declined" ? 0.5 : 1,

              }}>

                <div style={{

                  width: 40, height: 40, borderRadius: 11, flexShrink: 0,

                  background: `${o.color}18`, border: `1.5px solid ${o.color}33`,

                  display: "grid", placeItems: "center", fontSize: 11, fontWeight: 900, color: o.color,

                }}>{o.logo}</div>

                <div style={{ flex: 1, minWidth: 0 }}>

                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.company}</div>

                  <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 1 }}>{o.role}</div>

                </div>

                <span style={{

                  fontSize: 11, fontWeight: 800, borderRadius: 8, padding: "4px 10px",

                  background: st === "accepted" ? "rgba(61,220,151,0.15)" : "rgba(255,255,255,0.07)",

                  color: st === "accepted" ? "#3DDC97" : "var(--dim)",

                  whiteSpace: "nowrap",

                }}>{st === "accepted" ? t("offerAccepted") : t("offerDeclined")}</span>

              </div>

            );

          })}

        </>

      )}



      <div style={{ height: 24 }} />



      {showPaywall && (

        <PaywallSheet

          role="seeker"

          onSubscribe={() => { onSubscribe(); setShowPaywall(false); }}

          onClose={() => setShowPaywall(false)}

        />

      )}

      {exitSurvey && (
        <ExitSurveyModal
          company={exitSurvey.company}
          onClose={() => setExitSurvey(null)}
          onSubmit={() => setExitSurvey(null)}
        />
      )}

    </div>

  );

}



/* ── AI Career Coach ──────────────────────────────── */

function AICareerCoach() {

  const { lang } = useLang();

  const prompts = COACH_PROMPTS[lang] || COACH_PROMPTS.mn;

  const [messages, setMessages] = React.useState([]);

  const [typing, setTyping] = React.useState(false);

  const bottomRef = React.useRef(null);



  const ask = (q, a) => {

    if (typing) return;

    setMessages(p => [...p, { role: "user", text: q }]);

    setTyping(true);

    setTimeout(() => {

      setMessages(p => [...p, { role: "ai", text: a }]);

      setTyping(false);

    }, 1200);

  };



  React.useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);



  return (

    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "16px 16px 0" }}>

      {/* Header */}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>

        <img src="/mascot.png" alt="AI" style={{

          width: 44, height: 44, borderRadius: 14, flexShrink: 0,

          objectFit: "cover", background: "var(--bg-2)",

        }} />

        <div>

          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ink)" }}>

            {lang === "en" ? "AI Career Coach" : lang === "ko" ? "AI 커리어 코치" : "AI Карьер Зөвлөх"}

          </div>

          <div style={{ fontSize: 12, color: "#3DDC97", fontWeight: 600 }}>

            {lang === "en" ? "● Online" : lang === "ko" ? "● 온라인" : "● Онлайн"}

          </div>

        </div>

      </div>



      {/* Chat area */}

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 12 }}>

        {/* Welcome */}

        {messages.length === 0 && (

          <div style={{

            background: "linear-gradient(135deg,rgba(79,163,255,0.1),rgba(180,136,255,0.1))",

            border: "1px solid rgba(79,163,255,0.2)", borderRadius: 16, padding: "14px 16px",

          }}>

            <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.6 }}>

              {lang === "en" ? "👋 Hi! I'm your AI Career Coach. I analyze your profile and the job market to give you personalized advice. What would you like to know?"

               : lang === "ko" ? "👋 안녕하세요! 저는 AI 커리어 코치입니다. 프로필과 취업 시장을 분석하여 맞춤형 조언을 드립니다."

               : "👋 Сайн байна уу! Би таны AI Карьер Зөвлөх. Профайл болон ажлын зах зээлийг шинжлэн хувийн зөвлөмж өгнө."}

            </div>

          </div>

        )}



        {messages.map((m, i) => (

          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>

            <div style={{

              maxWidth: "85%", padding: "10px 14px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",

              background: m.role === "user" ? "linear-gradient(135deg,#FF6B35,#e8542a)" : "rgba(255,255,255,0.06)",

              border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.1)",

              color: "var(--ink)", fontSize: 13.5, lineHeight: 1.7,

              whiteSpace: "pre-wrap",

            }}>

              {m.text.replace(/\*\*(.*?)\*\*/g, '$1')}

            </div>

          </div>

        ))}



        {typing && (

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

            <div style={{ display: "flex", gap: 4, padding: "10px 14px", background: "rgba(255,255,255,0.06)", borderRadius: "16px 16px 16px 4px", border: "1px solid rgba(255,255,255,0.1)" }}>

              {[0,1,2].map(i => (

                <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#4FA3FF", animation: `coachDot .9s ${i * 0.2}s infinite` }} />

              ))}

            </div>

          </div>

        )}

        <div ref={bottomRef} />

      </div>



      {/* Quick prompts */}

      <div style={{ paddingBottom: 16, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 8 }}>

        <div style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>

          {lang === "en" ? "Ask me" : lang === "ko" ? "질문하기" : "Асуух"}

        </div>

        {prompts.map((p, i) => (

          <button key={i} onClick={() => ask(p.q, p.a)} disabled={typing} style={{

            textAlign: "left", padding: "10px 14px", borderRadius: 12,

            border: "1px solid rgba(79,163,255,0.25)",

            background: "rgba(79,163,255,0.06)",

            color: typing ? "var(--dim)" : "var(--ink)",

            fontSize: 13, cursor: typing ? "default" : "pointer",

            transition: "all .15s",

          }}>

            💬 {p.q}

          </button>

        ))}

      </div>

    </div>

  );

}



/* ── AI Recruiter Assistant ────────────────────────── */

/* ─────────────────────────────────────────────────────────
   AI RECRUITER — Premium Employer Feature
   Views: home → searching → results → detail
   ───────────────────────────────────────────────────────── */

const AI_SEARCH_PHASES = [
  { icon: "🔍", label: "Talent Pool дотроос хайж байна..." },
  { icon: "📄", label: "CV уншиж байна..." },
  { icon: "🎥", label: "Видео CV үзэж байна..." },
  { icon: "🛂", label: "Паспорт оноо шинжилж байна..." },
  { icon: "🏆", label: "Эрэмбэлж байна..." },
];

const EXAMPLE_QUERIES = [
  "5 гагнуурчин хайна",
  "8 жилийн туршлагатай барилгачин",
  "Хамгийн найдвартай жолооч",
  "Тогооч хайна",
  "Find me 3 welders",
];

function aiParseQuery(q, candidates) {
  const lower = q.toLowerCase();
  const countMatch = lower.match(/(\d+)\s*(нэр|хүн|гагнуур|барил|жолоо|тогоо|цахил|сант|хамгаа|мужаа|зөөг|цэвэр|оператор|боолт|будаг|слесарь|агуу|худал|welder|driver|cook|guard|electr|plumb|carp|clean|weld|worker|person|people|candidate)/);
  const wantCount = countMatch ? parseInt(countMatch[1]) : 5;

  const catKeywords = {
    "Гагнуурчин":    ["гагнуур","welder","weld","слесарь"],
    "Барилгачин":    ["барилга","barилга","construction","builder"],
    "Жолооч":        ["жолоо","driver","driving"],
    "Тогооч":        ["тогоо","cook","chef","хоол"],
    "Цахилгаанчин":  ["цахилга","electr","electric"],
    "Сантехникч":    ["сантехник","plumb","сант"],
    "Мужаан":        ["мужаан","carp","wood"],
    "Хамгаалагч":    ["хамгаалагч","guard","security"],
    "Зөөгч":         ["зөөгч","waiter","waitress","server"],
    "Цэвэрлэгч":     ["цэвэр","clean"],
    "Оператор":      ["оператор","operator"],
    "Худалдагч":     ["худалдагч","sales","seller"],
  };

  let matchCat = null;
  for (const [cat, kws] of Object.entries(catKeywords)) {
    if (kws.some(k => lower.includes(k))) { matchCat = cat; break; }
  }

  const yearMatch = lower.match(/(\d+)\s*(жил|year|yr)/);
  const minYears = yearMatch ? parseInt(yearMatch[1]) : 0;

  let pool = [...candidates].map(c => {
    // Deterministic, explainable match score — never random.
    // Every point must trace to a job-relevant attribute the employer can see.
    // Protected attributes (gender, age, name, location of origin) are excluded
    // by design to avoid discriminatory ranking.
    const { score, factors } = computeMatchScore(c, { matchCat, minYears });
    return { ...c, matchScore: score, matchFactors: factors };
  });

  if (matchCat) pool = pool.filter(c => c.category === matchCat || !matchCat);
  pool.sort((a, b) => b.matchScore - a.matchScore);
  return pool.slice(0, Math.max(wantCount, 3));
}

function aiGenerateDetail(c) {
  const m = AI_MATCH[c.id] || {};
  const ps = computePassportScore(c);
  return {
    strengths: m.reasons?.length ? m.reasons : [
      `${c.years} жилийн туршлага`,
      `Паспорт оноо ${ps.total}/100`,
      c.verified?.id ? "Биеийн байцаалт баталгаажсан" : "Мэдлэгийн тест өндөр оноотой",
    ],
    weaknesses: m.flags?.length ? m.flags : ["Гэрчилгээ цөөн", "Профайл бүрэн биш"],
    interviewQuestions: [
      `Та ${c.category.toLowerCase()} мэргэжлээрээ хамгийн бэрх ажлаа яриач?`,
      "Багт болон бие даан хэрхэн ажилладаг вэ?",
      `Хүсэж буй цалингийн ${tgr(c.salary)} талаар яаж үздэг вэ?`,
      "Ирэх 3 жилийн зорилгоо яриач.",
    ],
    riskAnalysis: m.flags?.length
      ? `Эрсдэл: ${m.flags.join("; ")}. Нарийвчлан судлахыг зөвлөж байна.`
      : "Томоохон эрсдэл илрээгүй. Ярилцлагад урих боломжтой.",
    recommendation: c.matchScore >= 85
      ? "🟢 Ярилцлагад яаралтай урих — маш өндөр тохирол"
      : c.matchScore >= 70
      ? "🟡 Ярилцлагад урих — сайн тохирол, нэмэлт шалгалт хийх"
      : "🟠 Нэмэлт дэлгэрэнгүй мэдээлэл авсны дараа шийдэх",
  };
}

function AIRecruiterPanel({ candidates = [], onContact, onSetStage }) {
  const { lang } = useLang();
  const [view, setView] = useState("home");   // home | searching | results | detail
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState(0);
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [actionFlash, setActionFlash] = useState("");
  const inputRef = useRef(null);

  function startSearch(q) {
    const trimmed = (q || query).trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setView("searching");
    setPhase(0);
    let p = 0;
    const iv = setInterval(() => {
      p++;
      if (p >= AI_SEARCH_PHASES.length) {
        clearInterval(iv);
        const r = aiParseQuery(trimmed, candidates);
        setResults(r);
        setTimeout(() => setView("results"), 400);
      } else {
        setPhase(p);
      }
    }, 520);
  }

  function openDetail(c) {
    setSelected(c);
    setDetail(aiGenerateDetail(c));
    setView("detail");
  }

  function doAction(label) {
    setActionFlash(label);
    setTimeout(() => setActionFlash(""), 2000);
  }

  const matchColor = (s) => s >= 85 ? "#3DDC97" : s >= 70 ? "#4FA3FF" : "#FFD23F";

  /* ── HOME ── */
  if (view === "home") return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflowY:"auto" }}>
      {/* Hero header */}
      <div style={{ background:"linear-gradient(160deg,#1a0e06,#0d0c0a)", padding:"28px 20px 20px", borderBottom:"1px solid rgba(255,107,53,0.15)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
          <img src="/mascot.png" alt="SwipeHire Bot" style={{ width:56, height:56, borderRadius:16, objectFit:"cover", flexShrink:0, filter:"drop-shadow(0 4px 16px rgba(255,107,53,0.5))" }} />
          <div>
            <div style={{ fontSize:19, fontWeight:900, color:"#fff", letterSpacing:-0.3 }}>AI Recruiter</div>
            <div style={{ fontSize:11, color:"#FF6B35", fontWeight:700, letterSpacing:0.5 }}>● {candidates.length} НЭРДЭВШИГЧ ШИНЖИЛЖ БАЙНА</div>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ position:"relative" }}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && startSearch()}
            placeholder='Жишээ: "5 гагнуурчин хайна"'
            style={{ width:"100%", boxSizing:"border-box", padding:"15px 56px 15px 18px", borderRadius:18, border:"1.5px solid rgba(255,107,53,0.32)", background:"rgba(255,255,255,0.05)", color:"#fff", fontSize:14.5, fontWeight:600, outline:"none", caretColor:"#FF6B35", boxShadow:"0 8px 26px rgba(255,107,53,.14), inset 0 1px 0 rgba(255,255,255,.06)" }}
          />
          <button
            onClick={() => startSearch()}
            style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", width:40, height:40, borderRadius:14, border:"none", background:"linear-gradient(135deg,#FF8A3D,#E85400)", color:"#fff", cursor:"pointer", display:"grid", placeItems:"center", fontSize:18, boxShadow:"0 6px 16px rgba(255,107,53,.4)" }}
          >
            <Search size={18} />
          </button>
        </div>
      </div>

      {/* Example queries */}
      <div style={{ padding:"16px 20px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"var(--dim)", letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>Жишээ хайлт</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {EXAMPLE_QUERIES.map((q, i) => (
            <button key={i} onClick={() => startSearch(q)} className="ai-ex" style={{ textAlign:"left", padding:"13px 15px", borderRadius:16, border:"1px solid rgba(255,255,255,0.08)", background:"linear-gradient(160deg,rgba(255,255,255,.06),rgba(255,255,255,.025))", color:"var(--ink)", fontSize:13.5, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:11, boxShadow:"0 4px 14px rgba(0,0,0,.28)" }}>
              <span style={{ width:32, height:32, flexShrink:0, borderRadius:10, display:"grid", placeItems:"center", fontSize:15, background:"rgba(79,163,255,.14)", border:"1px solid rgba(79,163,255,.24)" }}>🔎</span>
              <span style={{ flex:1 }}>{q}</span>
              <ChevronRight size={16} color="var(--dim)" />
            </button>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ padding:"0 20px 24px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {[
          { label:"Нийт нэр дэвшигч", value:candidates.length, icon:"👥", color:"#4FA3FF" },
          { label:"Баталгаажсан", value:candidates.filter(c=>c.verified?.id).length, icon:"✅", color:"#3DDC97" },
          { label:"Видео CV", value:candidates.filter(c=>c.videoUrl).length, icon:"🎥", color:"#FF6B35" },
          { label:"Ажиллах боломжтой", value:candidates.filter(c=>c.available).length, icon:"🟢", color:"#FFD23F" },
        ].map((s,i) => (
          <div key={i} style={{
            background:"linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.03))",
            border:"1px solid rgba(255,255,255,0.09)", borderRadius:20, padding:"16px 16px",
            boxShadow:"0 8px 22px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.07)",
            backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)",
            animation:`sh_rise 460ms cubic-bezier(.16,1,.3,1) ${i*70}ms both`,
          }}>
            <div style={{
              width:38, height:38, borderRadius:12, display:"grid", placeItems:"center", fontSize:19, marginBottom:9,
              background:s.color+"1f", border:`1px solid ${s.color}3d`, boxShadow:"inset 0 1px 0 rgba(255,255,255,.12)",
            }}>{s.icon}</div>
            <div style={{ fontSize:26, fontWeight:900, color:s.color, fontFamily:"'Barlow Condensed',sans-serif", lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:11, color:"var(--dim)", fontWeight:600, marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── SEARCHING ── */
  if (view === "searching") return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", padding:32, gap:28 }}>
      <div style={{ width:88, height:88, borderRadius:24, background:"transparent", display:"grid", placeItems:"center", animation:"aiPulse 1.2s ease-in-out infinite", filter:"drop-shadow(0 0 24px rgba(255,107,53,0.6))" }}>
        <img src="/mascot.png" alt="AI" style={{ width:88, height:88, objectFit:"cover", borderRadius:24 }} />
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:16, fontWeight:800, color:"#fff", marginBottom:6 }}>"{query}"</div>
        <div style={{ fontSize:13, color:"var(--dim)" }}>AI шинжилгээ хийж байна...</div>
      </div>
      <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:10 }}>
        {AI_SEARCH_PHASES.map((p, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:14, background: i <= phase ? "rgba(255,107,53,0.1)" : "rgba(255,255,255,0.02)", border: i <= phase ? "1px solid rgba(255,107,53,0.3)" : "1px solid rgba(255,255,255,0.05)", transition:"all 0.4s ease" }}>
            <span style={{ fontSize:20 }}>{p.icon}</span>
            <span style={{ fontSize:13, fontWeight:600, color: i <= phase ? "#FF6B35" : "var(--dim)", transition:"color 0.4s ease", flex:1 }}>{p.label}</span>
            {i < phase && <Check size={16} color="#3DDC97" />}
            {i === phase && (
              <div style={{ display:"flex", gap:3 }}>
                {[0,1,2].map(d => <span key={d} style={{ width:5, height:5, borderRadius:"50%", background:"#FF6B35", animation:`coachDot .8s ${d*0.2}s infinite` }} />)}
              </div>
            )}
          </div>
        ))}
      </div>
      <style>{`@keyframes aiPulse{0%,100%{transform:scale(1);box-shadow:0 0 40px rgba(255,107,53,0.4)}50%{transform:scale(1.06);box-shadow:0 0 60px rgba(255,107,53,0.7)}}`}</style>
    </div>
  );

  /* ── RESULTS ── */
  if (view === "results") return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Results header */}
      <div style={{ padding:"16px 20px 12px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,255,255,0.07)", flexShrink:0 }}>
        <button onClick={() => setView("home")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--dim)", padding:0, display:"flex" }}>
          <ChevronLeft size={22} />
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>"{query}"</div>
          <div style={{ fontSize:11, color:"#FF6B35", fontWeight:700 }}>{results.length} нэр дэвшигч олдлоо</div>
        </div>
        <button onClick={() => { setQuery(""); setView("home"); inputRef.current?.focus(); }} style={{ background:"rgba(255,107,53,0.1)", border:"1px solid rgba(255,107,53,0.3)", borderRadius:10, padding:"6px 12px", color:"#FF6B35", fontSize:12, fontWeight:700, cursor:"pointer" }}>
          Шинэ хайлт
        </button>
      </div>

      {/* AI transparency notice — required disclosure */}
      <div style={{ margin:"12px 16px 0", padding:"11px 13px", borderRadius:12, background:"rgba(79,163,255,0.08)", border:"1px solid rgba(79,163,255,0.22)", display:"flex", gap:9, alignItems:"flex-start", flexShrink:0 }}>
        <span style={{ fontSize:14, lineHeight:1.2 }}>ℹ️</span>
        <div style={{ fontSize:10.5, color:"rgba(255,255,255,0.62)", lineHeight:1.5 }}>
          Тохирлын оноог туршлага, ур чадвар, гэрчилгээ, баталгаажуулалт зэрэг
          <b style={{ color:"rgba(255,255,255,0.8)" }}> ажилд хамаарах мэдээлэлд </b>
          үндэслэн автоматаар тооцов. Хүйс, нас, нэр зэрэг хувийн шинжийг
          <b style={{ color:"rgba(255,255,255,0.8)" }}> ашиглаагүй</b>.
          Энэ нь зөвлөмж бөгөөд эцсийн шийдвэрийг та гаргана.
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"12px 16px 24px", display:"flex", flexDirection:"column", gap:12 }}>
        {results.map((c, i) => {
          const ps = computePassportScore(c);
          const mc = matchColor(c.matchScore);
          const accent = TRADE[c.category]?.hex || "#FF6B35";
          return (
            <button key={c.id} onClick={() => openDetail(c)} style={{ width:"100%", textAlign:"left", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:18, padding:"16px", cursor:"pointer", position:"relative", overflow:"hidden" }}>
              {/* Rank badge */}
              <div style={{ position:"absolute", top:12, right:12, width:36, height:36, borderRadius:10, background:`${mc}18`, border:`1.5px solid ${mc}44`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:13, fontWeight:900, color:mc, lineHeight:1 }}>{c.matchScore}</span>
                <span style={{ fontSize:8, color:mc, fontWeight:700 }}>%</span>
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                {/* Rank number */}
                <div style={{ fontSize:11, color:"var(--dim)", fontWeight:800, width:18, textAlign:"center", flexShrink:0 }}>#{i+1}</div>
                <Avatar c={c} size={44} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:15, fontWeight:800, color:"#fff", marginBottom:2 }}>{c.name} <span style={{ fontWeight:400, color:"var(--dim)", fontSize:13 }}>· {c.age}</span></div>
                  <div style={{ fontSize:12, fontWeight:700, color:accent }}>{c.category}</div>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:8 }}>
                <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"8px 10px" }}>
                  <div style={{ fontSize:10, color:"var(--dim)", marginBottom:2 }}>Паспорт</div>
                  <div style={{ fontSize:14, fontWeight:900, color:ps.color, fontFamily:"'Barlow Condensed',sans-serif" }}>{ps.total}<span style={{ fontSize:10, fontWeight:600, color:"var(--dim)" }}>/100</span></div>
                </div>
                <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"8px 10px" }}>
                  <div style={{ fontSize:10, color:"var(--dim)", marginBottom:2 }}>Туршлага</div>
                  <div style={{ fontSize:14, fontWeight:900, color:"#fff", fontFamily:"'Barlow Condensed',sans-serif" }}>{c.years}<span style={{ fontSize:10, fontWeight:600, color:"var(--dim)" }}> жил</span></div>
                </div>
                <div style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"8px 10px" }}>
                  <div style={{ fontSize:10, color:"var(--dim)", marginBottom:2 }}>Цалин</div>
                  <div style={{ fontSize:11, fontWeight:900, color:"#FFD23F", fontFamily:"'Barlow Condensed',sans-serif" }}>{tgr(c.salary)}</div>
                </div>
              </div>

              {/* AI summary */}
              <div style={{ marginTop:10, fontSize:12, color:"rgba(255,255,255,0.6)", lineHeight:1.5, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                <Sparkles size={11} style={{ display:"inline", marginRight:4, color:"#FFD23F" }} />{c.ai?.resume || `${c.category} мэргэжлээр ${c.years} жил ажилласан`}
              </div>

              <div style={{ position:"absolute", bottom:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${mc},transparent)`, opacity:0.4 }} />
            </button>
          );
        })}
      </div>
    </div>
  );

  /* ── DETAIL ── */
  if (view === "detail" && selected && detail) {
    const mc = matchColor(selected.matchScore);
    const ps = computePassportScore(selected);
    const accent = TRADE[selected.category]?.hex || "#FF6B35";
    return (
      <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
        {/* Header */}
        <div style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,255,255,0.07)", flexShrink:0 }}>
          <button onClick={() => setView("results")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--dim)", padding:0 }}>
            <ChevronLeft size={22} />
          </button>
          <span style={{ fontSize:14, fontWeight:800, color:"#fff", flex:1 }}>AI Дүгнэлт</span>
          <div style={{ fontSize:20, fontWeight:900, color:mc, fontFamily:"'Barlow Condensed',sans-serif" }}>{selected.matchScore}%</div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 24px" }}>
          {/* Candidate mini-header */}
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:18, padding:"14px 16px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:18 }}>
            <Avatar c={selected} size={54} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:17, fontWeight:800, color:"#fff" }}>{selected.name} <span style={{ fontWeight:400, color:"var(--dim)", fontSize:14 }}>· {selected.age}</span></div>
              <div style={{ fontSize:12, fontWeight:700, color:accent, marginBottom:4 }}>{selected.category} · {selected.years} жил</div>
              <div style={{ fontSize:12, color:"var(--dim)" }}>{tgr(selected.salary)} / сар</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ width:44, height:44, borderRadius:12, background:`${ps.color}18`, border:`2px solid ${ps.color}44`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:15, fontWeight:900, color:ps.color }}>{ps.total}</span>
              </div>
              <div style={{ fontSize:9, color:"var(--dim)", marginTop:2 }}>Паспорт</div>
            </div>
          </div>

          {/* Match score bar */}
          <div style={{ marginBottom:18, padding:"14px 16px", background:`${mc}0d`, border:`1px solid ${mc}33`, borderRadius:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              <span style={{ fontSize:12, fontWeight:700, color:mc }}>AI Тохирлын оноо</span>
              <span style={{ fontSize:18, fontWeight:900, color:mc, fontFamily:"'Barlow Condensed',sans-serif" }}>{selected.matchScore}%</span>
            </div>
            <div style={{ height:6, borderRadius:3, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
              <div style={{ width:`${selected.matchScore}%`, height:"100%", background:`linear-gradient(90deg,${mc},${mc}aa)`, borderRadius:3, transition:"width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
            </div>
          </div>

          {/* Strengths */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:800, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>✅ Давуу тал</div>
            {detail.strengths.map((s,i) => (
              <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <Check size={14} color="#3DDC97" style={{ flexShrink:0, marginTop:1 }} />
                <span style={{ fontSize:13, color:"var(--ink)", lineHeight:1.5 }}>{s}</span>
              </div>
            ))}
          </div>

          {/* Weaknesses */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:800, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>⚠️ Сул тал</div>
            {detail.weaknesses.map((s,i) => (
              <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize:13, color:"#FFD23F", lineHeight:1.5 }}>• {s}</span>
              </div>
            ))}
          </div>

          {/* Interview Questions */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:800, color:"var(--dim)", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>🎤 Ярилцлагын асуулт</div>
            {detail.interviewQuestions.map((q,i) => (
              <div key={i} style={{ padding:"10px 14px", borderRadius:12, background:"rgba(79,163,255,0.07)", border:"1px solid rgba(79,163,255,0.15)", marginBottom:8, fontSize:13, color:"var(--ink)", lineHeight:1.5 }}>
                <span style={{ color:"#4FA3FF", fontWeight:700 }}>{i+1}. </span>{q}
              </div>
            ))}
          </div>

          {/* Risk Analysis */}
          <div style={{ marginBottom:14, padding:"14px 16px", borderRadius:14, background:"rgba(255,210,63,0.06)", border:"1px solid rgba(255,210,63,0.2)" }}>
            <div style={{ fontSize:11, fontWeight:800, color:"#FFD23F", textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>🔐 Эрсдэлийн шинжилгээ</div>
            <p style={{ margin:0, fontSize:13, color:"var(--ink)", lineHeight:1.6 }}>{detail.riskAnalysis}</p>
          </div>

          {/* Recommendation */}
          <div style={{ marginBottom:22, padding:"14px 16px", borderRadius:14, background:`${mc}0f`, border:`1px solid ${mc}33` }}>
            <div style={{ fontSize:11, fontWeight:800, color:mc, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>🏆 Зөвлөмж</div>
            <p style={{ margin:0, fontSize:14, fontWeight:700, color:"var(--ink)", lineHeight:1.6 }}>{detail.recommendation}</p>
          </div>

          {/* Actions */}
          {actionFlash ? (
            <div style={{ padding:"14px", borderRadius:14, background:"rgba(61,220,151,0.1)", border:"1px solid rgba(61,220,151,0.3)", textAlign:"center", fontSize:14, fontWeight:700, color:"#3DDC97" }}>
              ✓ {actionFlash}
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <button onClick={() => doAction("Урилга илгээлээ")} style={{ padding:"13px 0", borderRadius:14, border:"none", background:"linear-gradient(135deg,#FF6B35,#e8542a)", color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <Mail size={16} /> Урих
              </button>
              <button onClick={() => doAction("Мессеж илгээлээ")} style={{ padding:"13px 0", borderRadius:14, border:"none", background:"rgba(79,163,255,0.15)", color:"#4FA3FF", fontWeight:800, fontSize:13, cursor:"pointer", border:"1px solid rgba(79,163,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <MessageCircle size={16} /> Мессеж
              </button>
              <button onClick={() => doAction("Ярилцлага товлолоо")} style={{ padding:"13px 0", borderRadius:14, border:"1px solid rgba(255,210,63,0.3)", background:"rgba(255,210,63,0.08)", color:"#FFD23F", fontWeight:800, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <CalendarClock size={16} /> Ярилцлага
              </button>
              <button onClick={() => doAction("Ажилд авах шийдвэр гаргалаа")} style={{ padding:"13px 0", borderRadius:14, border:"1px solid rgba(61,220,151,0.3)", background:"rgba(61,220,151,0.08)", color:"#3DDC97", fontWeight:800, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <CheckCircle2 size={16} /> Авах
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}



/* ── Санхүүгийн самбар (ажил хайгч) ─────────────────── */

function SeekerFinancePanel() {

  const { t, lang } = useLang();

  const [subscribed, setSubscribed] = useState(false);

  const [showPaywall, setShowPaywall] = useState(false);



  const SEEKER_INVOICES = [

    { id: "INV-S021", date: "2025-06-01", desc: "Pro план · 1 сар", amount: 4999, paid: true },

    { id: "INV-S014", date: "2025-05-01", desc: "Pro план · 1 сар", amount: 4999, paid: true },

  ];

  const total = SEEKER_INVOICES.reduce((s, i) => s + i.amount, 0);



  return (

    <div style={{ padding: "16px 16px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* PRIMARY job-seeker billing: pay-per-service (Step 5) */}
      <div style={{ margin: "-16px -16px 0" }}>
        <SeekerPaymentsPanel lang={lang} />
      </div>

      {/* ── LEGACY Job Seeker PRO (compatibility only — do not extend/promote) ── */}
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "#9a968d", background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 12px", lineHeight: 1.45 }}>
        {lang === "en"
          ? "Legacy PRO subscription below is kept for compatibility only. The pay-per-service model above is the current offer."
          : "Доорх хуучин PRO багц нь зөвхөн нийцтэй байдлын үүднээс үлдээгдсэн. Дээрх үйлчилгээ тус бүрээр төлөх загвар нь одоогийн санал."}
      </div>

      {/* Үнийн санал харьцуулалт */}

      {!subscribed && (

        <div>

          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dim)", letterSpacing: ".5px", marginBottom: 10 }}>{t("pricingTitle")}</div>

          <div style={{ display: "flex", gap: 10 }}>

            {SEEKER_PLANS.map((p, i) => (

              <div key={p.id} onClick={() => setShowPaywall(true)} style={{

                flex: 1, padding: "14px 10px", borderRadius: 16, cursor: "pointer",

                background: i === 1 ? "rgba(255,107,53,0.1)" : "rgba(255,255,255,0.04)",

                border: i === 1 ? "1.5px solid rgba(255,107,53,0.4)" : "1.5px solid rgba(255,255,255,0.08)",

                textAlign: "center", position: "relative",

              }}>

                {p.badge && (

                  <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", background: "#FF6B35", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>{p.badge}</div>

                )}

                <div style={{ fontSize: 11, color: "var(--dim)", fontWeight: 700, marginBottom: 4 }}>{p.label}</div>

                <div style={{ fontSize: 16, fontWeight: 900, color: i === 1 ? "#FF6B35" : "var(--ink)" }}>{p.price}</div>

              </div>

            ))}

          </div>

        </div>

      )}



      {/* Stats */}

      <div style={{ display: "flex", gap: 10 }}>

        {[

          { label: t("totalSpend"), value: `₮${total.toLocaleString()}`, color: "#FF6B35" },

          { label: t("applications"), value: "0", color: "#3DDC97" },

          { label: t("profileViews"), value: "12", color: "#4FA3FF" },

        ].map(s => (

          <div key={s.label} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px 10px", textAlign: "center" }}>

            <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--dim)", letterSpacing: ".4px", marginBottom: 5 }}>{s.label}</div>

            <div style={{ fontSize: 20, fontWeight: 900, color: s.color, fontFamily: "'Barlow Condensed',sans-serif" }}>{s.value}</div>

          </div>

        ))}

      </div>



      {/* Нэхэмжлэхүүд */}

      <div>

        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dim)", letterSpacing: ".5px", marginBottom: 10 }}>{t("invoices")}</div>

        {SEEKER_INVOICES.length === 0 ? (

          <div style={{ textAlign: "center", color: "var(--dim)", fontSize: 13, padding: "20px 0" }}>{t("invoices")} —</div>

        ) : SEEKER_INVOICES.map(inv => (

          <div key={inv.id} style={{

            display: "flex", alignItems: "center", gap: 12,

            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",

            borderRadius: 14, padding: "12px 14px", marginBottom: 8,

          }}>

            <div style={{ flex: 1 }}>

              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{inv.desc}</div>

              <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>{inv.id} · {inv.date}</div>

            </div>

            <div style={{ textAlign: "right" }}>

              <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>₮{inv.amount.toLocaleString()}</div>

              <div style={{ fontSize: 10.5, color: inv.paid ? "#3DDC97" : "#FF6B35", fontWeight: 700, marginTop: 2 }}>

                {inv.paid ? t("paid") : t("pending")}

              </div>

            </div>

          </div>

        ))}

      </div>



      <PaymentGuide t={t} lang={lang} onGoPro={() => setShowPaywall(true)} />



      {showPaywall && (

        <PaywallSheet role="seeker" onSubscribe={() => { if (!SUPABASE_CONFIGURED) setSubscribed(true); /* legacy demo-only */ setShowPaywall(false); }} onClose={() => setShowPaywall(false)} />

      )}

    </div>

  );

}



/* ── Санхүүгийн самбар (ажил олгогч) ────────────────── */

const INVOICES = [

  { id: "INV-0043", date: "2025-06-01", desc: "Pro план · 1 сар", amount: 49999, paid: true },

  { id: "INV-0031", date: "2025-05-01", desc: "Pro план · 1 сар", amount: 49999, paid: true },

  { id: "INV-0019", date: "2025-04-01", desc: "Pro план · 1 сар", amount: 49999, paid: true },

];



/* ── Төлбөрийн гарын авлага ─────────────────────── */

function PaymentGuide({ t, lang, onGoPro }) {

  const benefits = [
    { icon: "🔓", text: lang === "en" ? "Unlimited swipes" : "Хязгааргүй үзэх" },
    { icon: "🤖", text: lang === "en" ? "Full AI features" : "AI боломжууд бүрэн нээгдэнэ" },
    { icon: "🚀", text: lang === "en" ? "Priority visibility" : "Эхэнд харагдах давуу эрх" },
    { icon: "👑", text: lang === "en" ? "PRO badge" : "PRO тэмдэг" },
  ];



  return (

    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>



      {/* PRO болох — төлбөрийн аргын оронд */}

      <div>

        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dim)", letterSpacing: ".5px", marginBottom: 12 }}>

          {lang === "en" ? "GO PRO" : "PRO БОЛОХ"}

        </div>

        <div style={{
          background: "linear-gradient(135deg, rgba(255,106,0,0.12), rgba(255,106,0,0.04))",
          border: "1.5px solid rgba(255,106,0,0.35)", borderRadius: 16, padding: "18px 16px",
        }}>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {benefits.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20, lineHeight: 1, width: 26, textAlign: "center" }}>{b.icon}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", flex: 1 }}>{b.text}</span>
                <Check size={15} color="#3DDC97" />
              </div>
            ))}
          </div>

          <button onClick={onGoPro} style={{
            width: "100%", padding: "14px", borderRadius: 14, border: "none",
            background: "linear-gradient(135deg,#FF6A00,#e85d00)", color: "#fff",
            fontSize: 15, fontWeight: 800, cursor: "pointer",
            boxShadow: "0 4px 18px rgba(255,106,0,0.3)",
          }}>
            👑 {lang === "en" ? "Go PRO" : "PRO болох"}
          </button>

          <div style={{ textAlign: "center", fontSize: 11, color: "var(--dim)", marginTop: 8 }}>
            {lang === "en" ? "Free during the beta period" : "Туршилтын хугацаанд төлбөр авахгүй"}
          </div>

        </div>

      </div>



      {/* Тусламж */}

      <div style={{

        borderRadius: 14, background: "rgba(255,255,255,0.04)",

        border: "1px solid rgba(255,255,255,0.08)", padding: "14px 16px",

        display: "flex", alignItems: "center", gap: 12,

      }}>

        <span style={{ fontSize: 22 }}>🎧</span>

        <div>

          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>

            {lang === "en" ? "Need help?" : "Тусламж хэрэгтэй юу?"}

          </div>

          <div style={{ fontSize: 11.5, color: "var(--dim)", marginTop: 2 }}>

            {lang === "en" ? "support@swipehire.mn · 7700-1234" : "support@swipehire.mn · 7700-1234"}

          </div>

        </div>

      </div>



    </div>

  );

}



/* ── Profession Dropdown ────────────────────────────── */

const PROF_GROUPS = [

  {

    label: { mn: "Барилга & Угсралт", en: "Construction & Assembly", ko: "건설 & 조립" },

    cats: [

      "Барилгачин", "Мужаан", "Гагнуурчин", "Гагнуур слесарь", "Будагчин",

      "Цахилгаанчин", "Сантехникч", "Засварчин", "Дулааны техникч",

      "Тоосгочин", "Хаалга цонхны дархан", "Хучлагачин", "Эрдэс чимэглэлчин",

      "Ган бетончин", "Суурь малталтын ажилчин",

    ],

  },

  {

    label: { mn: "Үйлдвэрлэл & Машин", en: "Manufacturing & Machinery", ko: "제조 & 기계" },

    cats: [

      "Оператор", "Тоног төхөөрөмжийн засварчин", "CNC оператор",

      "Хуванцар боловсруулагч", "Металл боловсруулагч", "Уурхайн машинч",

      "Форклифтчин", "Кранчин", "Экскаватор жолооч", "Бульдозерчин",

    ],

  },

  {

    label: { mn: "Тээвэр & Логистик", en: "Transport & Logistics", ko: "운송 & 물류" },

    cats: [

      "Жолооч", "Агуулахын ажилтан", "Боолтчин", "Ачигч буулгагч",

      "Такси жолооч", "Автобус жолооч", "Том машины жолооч",

      "Курьер", "Логистикийн менежер", "Хил гаалийн мэргэжилтэн",

    ],

  },

  {

    label: { mn: "Хоол хүнс & Зочлох үйлчилгээ", en: "Food & Hospitality", ko: "음식 & 환대" },

    cats: [

      "Тогооч", "Зөөгч", "Барист", "Нарийн боов хийгч",

      "Хоолны дэд тогооч", "Буфетчин", "Зочид буудлын администратор",

      "Угаагч", "Бэлтгэлийн тогооч", "Кейтеринг туслах",

    ],

  },

  {

    label: { mn: "Үйлчилгээ & Дэлгүүр", en: "Service & Retail", ko: "서비스 & 소매" },

    cats: [

      "Худалдагч", "Кассир", "Зах зээлийн ажилтан", "Мерчандайзер",

      "Хамгаалагч", "Цэвэрлэгч", "Угаалгын ажилтан", "Эмнэлгийн цэвэрлэгч",

      "Оффисын туслах", "Администратор",

    ],

  },

  {

    label: { mn: "Эрүүл мэнд & Нийгмийн үйлчилгээ", en: "Health & Social", ko: "보건 & 사회" },

    cats: [

      "Сувилагч", "Туслах сувилагч", "Эмнэлгийн лаборант",

      "Рентген техникч", "Нялхсын сахиул", "Ахмад настны асрагч",

      "Хөгжлийн бэрхшээлтэй иргэний туслах", "Нийгмийн ажилтан",

      "Эмийн сангийн туслах", "Эмч туслагч",

    ],

  },

  {

    label: { mn: "Мэдээллийн технологи", en: "Information Technology", ko: "정보 기술" },

    cats: [

      "Програм хангамжийн инженер", "Вэб хөгжүүлэгч", "Мобайл хөгжүүлэгч",

      "Сүлжээний инженер", "Мэдээллийн баазын администратор",

      "Кибер аюулгүй байдлын мэргэжилтэн", "Дата аналитик",

      "UI/UX дизайнер", "DevOps инженер", "IT дэмжлэгийн ажилтан",

    ],

  },

  {

    label: { mn: "Санхүү & Бизнес", en: "Finance & Business", ko: "금융 & 비즈니스" },

    cats: [

      "Нягтлан бодогч", "Санхүүгийн шинжээч", "Аудитор",

      "Татварын зөвлөх", "Банкны менежер", "Зээлийн мэргэжилтэн",

      "Даатгалын агент", "HR менежер", "Борлуулалтын менежер",

      "Маркетингийн мэргэжилтэн",

    ],

  },

  {

    label: { mn: "Боловсрол & Сургалт", en: "Education & Training", ko: "교육 & 훈련" },

    cats: [

      "Багш", "Сургуулийн өмнөх боловсролын багш", "Хувийн багш",

      "Спортын дасгалжуулагч", "Хэл заах багш", "Сургалтын зохицуулагч",

      "Номын сангийн ажилтан", "Сургуулийн сэтгэл зүйч",

    ],

  },

  {

    label: { mn: "Хөдөө аж ахуй & Байгаль", en: "Agriculture & Environment", ko: "농업 & 환경" },

    cats: [

      "Фермер", "Малчин", "Хүлэмжийн ажилтан", "Ой мод хамгаалагч",

      "Усны аж ахуйн ажилтан", "Хөрсний шинжилгээний техникч",

      "Тариалангийн машинч", "Цэцэрлэгч", "Хүнсний боловсруулагч",

    ],

  },

  {

    label: { mn: "Уул уурхай & Эрчим хүч", en: "Mining & Energy", ko: "광업 & 에너지" },

    cats: [

      "Уурхайн ажилтан", "Уурхайн инженер", "Тэсрэх бодисын мэргэжилтэн",

      "Геологич", "Газрын тосны техникч", "Нарны эрчим хүчний техникч",

      "Цахилгаан станцын ажилтан", "Байгаль орчны шинжилгээч",

    ],

  },

  {

    label: { mn: "Урлаг & Медиа & Дизайн", en: "Arts, Media & Design", ko: "예술, 미디어 & 디자인" },

    cats: [

      "График дизайнер", "Видео эдитор", "Гэрэл зурагчин",

      "Контент бүтээгч", "SMM менежер", "Сэтгүүлч",

      "Архитект", "Интерьер дизайнер", "Анимейтор",

    ],

  },

];



// Sync CATEGORIES with all profession groups (keeps existing logic working)

const ALL_PROF_CATS = PROF_GROUPS.flatMap(g => g.cats);



function ProfessionDropdown({ filter, setFilter, lang }) {

  const { t } = useLang();

  const [open, setOpen] = React.useState(false);

  const [search, setSearch] = React.useState("");

  const [recent, setRecent] = React.useState([]);

  const overlayRef = React.useRef(null);

  const inputRef = React.useRef(null);



  React.useEffect(() => {

    if (open && inputRef.current) inputRef.current.focus();

  }, [open]);



  const toggle = (cat) => {

    setFilter(prev => {

      const next = prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat];

      if (!prev.includes(cat)) setRecent(r => [cat, ...r.filter(x => x !== cat)].slice(0, 4));

      return next;

    });

  };



  const clearAll = () => setFilter([]);



  const query = search.trim().toLowerCase();

  const matchesCat = (cat) => !query || cat.toLowerCase().includes(query) || t(cat).toLowerCase().includes(query);



  const label = (mn, en, ko) => lang === "en" ? en : lang === "ko" ? ko : mn;



  const triggerLabel = () => {

    if (filter.length === 0) return label("Бүх мэргэжил", "All Professions", "모든 직업");

    if (filter.length === 1) return t(filter[0]);

    return `${filter.length} ${label("мэргэжил", "professions", "직업")}`;

  };



  return (

    <>

      {/* Trigger pill */}

      <button onClick={() => setOpen(true)} style={{

        flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 7,

        background: filter.length > 0 ? "rgba(255,107,53,0.15)" : "rgba(255,255,255,0.07)",

        border: `1px solid ${filter.length > 0 ? "rgba(255,107,53,0.45)" : "rgba(255,255,255,0.13)"}`,

        borderRadius: 10, padding: "7px 11px", cursor: "pointer", transition: "all .15s",

        overflow: "hidden",

      }}>

        <Search size={14} style={{ flexShrink: 0, color: filter.length > 0 ? "#FF6B35" : "var(--dim)" }} />

        <span style={{

          fontSize: 13, fontWeight: filter.length > 0 ? 700 : 500,

          color: filter.length > 0 ? "var(--ink)" : "var(--dim)",

          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left",

        }}>{triggerLabel()}</span>

        {filter.length > 0 && (

          <span style={{

            fontSize: 10, fontWeight: 800, background: "#FF6B35", color: "#fff",

            borderRadius: 99, padding: "1px 6px", flexShrink: 0,

          }}>{filter.length}</span>

        )}

        <ChevronDown size={13} style={{ flexShrink: 0, color: "var(--dim)" }} />

      </button>



      {/* Overlay */}

      {open && (

        <div ref={overlayRef} style={{

          position: "fixed", inset: 0, zIndex: 200,

          display: "flex", flexDirection: "column",

          background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",

        }} onClick={(e) => { if (e.target === overlayRef.current) setOpen(false); }}>

          {/* Sheet */}

          <div style={{

            position: "absolute", bottom: 0, left: 0, right: 0,

            background: "var(--bg-2)", borderRadius: "20px 20px 0 0",

            borderTop: "1px solid rgba(255,255,255,0.1)",

            maxHeight: "82vh", display: "flex", flexDirection: "column",

            boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",

          }}>

            {/* Handle */}

            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>

              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.18)" }} />

            </div>



            {/* Header row */}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 16px 12px" }}>

              <span style={{ fontSize: 16, fontWeight: 800, color: "var(--ink)" }}>

                {label("Мэргэжил сонгох", "Select Professions", "직업 선택")}

              </span>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>

                {filter.length > 0 && (

                  <button onClick={clearAll} style={{

                    background: "none", border: "none", cursor: "pointer",

                    fontSize: 12, fontWeight: 700, color: "#FF6B35", padding: "4px 8px",

                  }}>{label("Арилгах", "Clear", "지우기")}</button>

                )}

                <button onClick={() => setOpen(false)} style={{

                  background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8,

                  width: 30, height: 30, display: "grid", placeItems: "center", cursor: "pointer", color: "var(--ink)",

                }}><X size={16} /></button>

              </div>

            </div>



            {/* Search input */}

            <div style={{ padding: "0 16px 12px" }}>

              <div style={{

                display: "flex", alignItems: "center", gap: 9,

                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",

                borderRadius: 12, padding: "9px 13px",

              }}>

                <Search size={15} style={{ color: "var(--dim)", flexShrink: 0 }} />

                <input

                  ref={inputRef}

                  value={search}

                  onChange={e => setSearch(e.target.value)}

                  placeholder={label("Мэргэжил хайх...", "Search professions...", "직업 검색...")}

                  style={{

                    flex: 1, background: "none", border: "none", outline: "none",

                    color: "var(--ink)", fontSize: 14,

                  }}

                />

                {search && (

                  <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", padding: 0 }}>

                    <X size={14} />

                  </button>

                )}

              </div>

            </div>



            {/* Scrollable list */}

            <div style={{ overflowY: "auto", flex: 1, padding: "0 16px 24px" }}>



              {/* Recent */}

              {!query && recent.length > 0 && (

                <div style={{ marginBottom: 18 }}>

                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>

                    {label("Сүүлийн сонголт", "Recent", "최근")}

                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>

                    {recent.map(cat => (

                      <button key={cat} onClick={() => toggle(cat)} style={{

                        padding: "6px 13px", borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: "pointer",

                        background: filter.includes(cat) ? "rgba(255,107,53,0.2)" : "rgba(255,255,255,0.07)",

                        border: `1px solid ${filter.includes(cat) ? "rgba(255,107,53,0.5)" : "rgba(255,255,255,0.12)"}`,

                        color: filter.includes(cat) ? "#FF6B35" : "var(--ink)",

                        transition: "all .12s",

                      }}>

                        {filter.includes(cat) && "✓ "}{t(cat)}

                      </button>

                    ))}

                  </div>

                </div>

              )}



              {/* All categories — grouped */}

              {PROF_GROUPS.map(group => {

                const visible = group.cats.filter(matchesCat);

                if (visible.length === 0) return null;

                return (

                  <div key={group.label.mn} style={{ marginBottom: 18 }}>

                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>

                      {group.label[lang] || group.label.mn}

                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>

                      {visible.map(cat => {

                        const on = filter.includes(cat);

                        const col = TRADE[cat]?.hex || "#FF6B35";

                        return (

                          <button key={cat} onClick={() => toggle(cat)} style={{

                            display: "flex", alignItems: "center", gap: 12,

                            padding: "10px 13px", borderRadius: 12, cursor: "pointer", textAlign: "left",

                            background: on ? `${col}15` : "rgba(255,255,255,0.04)",

                            border: `1px solid ${on ? `${col}50` : "rgba(255,255,255,0.08)"}`,

                            transition: "all .12s",

                          }}>

                            <span style={{ width: 10, height: 10, borderRadius: 3, background: col, flexShrink: 0 }} />

                            <span style={{ flex: 1, fontSize: 14, fontWeight: on ? 700 : 500, color: on ? "var(--ink)" : "var(--dim)" }}>

                              {t(cat)}

                            </span>

                            <div style={{

                              width: 20, height: 20, borderRadius: 6, flexShrink: 0,

                              border: `2px solid ${on ? col : "rgba(255,255,255,0.2)"}`,

                              background: on ? col : "transparent",

                              display: "grid", placeItems: "center", transition: "all .12s",

                            }}>

                              {on && <Check size={11} color="#000" strokeWidth={3} />}

                            </div>

                          </button>

                        );

                      })}

                    </div>

                  </div>

                );

              })}



              {/* No results */}

              {query && PROF_GROUPS.every(g => g.cats.filter(matchesCat).length === 0) && (

                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--dim)", fontSize: 14 }}>

                  {label("Тохирох мэргэжил олдсонгүй", "No professions found", "직업을 찾을 수 없습니다")}

                </div>

              )}

            </div>



            {/* Apply */}

            <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>

              <button onClick={() => setOpen(false)} style={{

                width: "100%", padding: "14px 0", borderRadius: 13, border: "none",

                background: "linear-gradient(135deg,#FF6B35,#e8542a)",

                color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer",

              }}>

                {filter.length === 0

                  ? label("Бүгдийг харах", "Show All", "전체 보기")

                  : label(`${filter.length} мэргэжил харах`, `Show ${filter.length} profession${filter.length > 1 ? "s" : ""}`, `${filter.length}개 직업 보기`)}

              </button>

            </div>

          </div>

        </div>

      )}

    </>

  );

}



/* ── Mock Company Registry ──────────────────────────── */

const COMPANY_REGISTRY = {

  "1234567": {

    regNumber: "1234567",

    name: "Монголын Ган ХХК",

    legalForm: "ХХК",

    status: "Идэвхтэй",

    address: "Улаанбаатар, Хан-Уул дүүрэг, 3-р хороо, Их Тойруу 15",

    founded: "2008-03-14",

    director: "Батболд Дорж",

  },

  "7654321": {

    regNumber: "7654321",

    name: "BuildPro Construction LLC",

    legalForm: "LLC",

    status: "Active",

    address: "Ulaanbaatar, Bayanzurkh, 4th khoroo, Peace Ave 42",

    founded: "2015-07-22",

    director: "Enkh-Amgalan B.",

  },

  "1111111": {

    regNumber: "1111111",

    name: "Эрдэнэт Үйлдвэр ХХК",

    legalForm: "ХХК",

    status: "Идэвхтэй",

    address: "Орхон аймаг, Эрдэнэт хот, Баянцагаан баг",

    founded: "1978-05-01",

    director: "Ганбаатар Д.",

  },

  "9999999": {

    regNumber: "9999999",

    name: "Asia Mining Corp",

    legalForm: "LLC",

    status: "Active",

    address: "Ulaanbaatar, Sukhbaatar, 1st khoroo, Seoul Street 7",

    founded: "2010-11-30",

    director: "Kim Sung-ho",

  },

};



/* ── AI Profession Suggestion Map ───────────────────── */

const PROF_AI_MAP = [

  { keys: ["гагнуур", "welding", "용접"], suggestions: ["Гагнуурчин", "Гагнуур слесарь", "Металл боловсруулагч", "Барилгачин", "Цахилгаанчин"] },

  { keys: ["барилга", "construction", "건설"], suggestions: ["Барилгачин", "Мужаан", "Гагнуурчин", "Цахилгаанчин", "Сантехникч"] },

  { keys: ["ресторан", "restaurant", "레스토랑", "кафе", "cafe", "хоол", "food"], suggestions: ["Тогооч", "Зөөгч", "Барист", "Гал тогооны туслах", "Бэлтгэлийн тогооч"] },

  { keys: ["жолооч", "driver", "운전", "тээвэр", "transport"], suggestions: ["Жолооч", "Такси жолооч", "Том машины жолооч", "Автобус жолооч", "Курьер"] },

  { keys: ["цахилгаан", "electric", "전기"], suggestions: ["Цахилгаанчин", "Дулааны техникч", "CNC оператор", "Тоног төхөөрөмжийн засварчин", "Оператор"] },

  { keys: ["сантехник", "plumb", "배관"], suggestions: ["Сантехникч", "Барилгачин", "Засварчин", "Дулааны техникч", "Цахилгаанчин"] },

  { keys: ["цэвэрлэг", "clean", "청소"], suggestions: ["Цэвэрлэгч", "Угаагч", "Хамгаалагч", "Оффисын туслах", "Эмнэлгийн цэвэрлэгч"] },

  { keys: ["хамгаал", "security", "보안", "харуул"], suggestions: ["Хамгаалагч", "Цэвэрлэгч", "Оффисын туслах", "Администратор", "Кассир"] },

  { keys: ["худалдаа", "sales", "판매", "дэлгүүр", "shop"], suggestions: ["Худалдагч", "Кассир", "Мерчандайзер", "Администратор", "Оффисын туслах"] },

  { keys: ["it", "программ", "software", "소프트웨어", "веб", "web"], suggestions: ["Програм хангамжийн инженер", "Вэб хөгжүүлэгч", "Мобайл хөгжүүлэгч", "UI/UX дизайнер", "DevOps инженер"] },

  { keys: ["нягтлан", "accountant", "회계", "санхүү", "finance"], suggestions: ["Нягтлан бодогч", "Санхүүгийн шинжээч", "Аудитор", "Татварын зөвлөх", "HR менежер"] },

  { keys: ["малч", "farmer", "농부", "мал"], suggestions: ["Малчин", "Фермер", "Тариалангийн машинч", "Цэцэрлэгч", "Ой мод хамгаалагч"] },

  { keys: ["уурхай", "mining", "광업", "эрдэс"], suggestions: ["Уурхайн ажилтан", "Уурхайн инженер", "Форклифтчин", "Кранчин", "Экскаватор жолооч"] },

  { keys: ["мужаан", "carpenter", "목수", "хаалга", "mod"], suggestions: ["Мужаан", "Хаалга цонхны дархан", "Барилгачин", "Будагчин", "Эрдэс чимэглэлчин"] },

];



function getAISuggestions(query) {

  if (!query || query.length < 2) return [];

  const q = query.toLowerCase();

  for (const entry of PROF_AI_MAP) {

    if (entry.keys.some(k => q.includes(k) || k.includes(q))) {

      return entry.suggestions;

    }

  }

  // fallback: search prof groups by name

  const matches = PROF_GROUPS.flatMap(g => g.cats).filter(c => c.toLowerCase().includes(q)).slice(0, 5);

  return matches;

}



/* ── Employer Trust System ──────────────────────────── */

const COUNTRIES = [
  { code: "MN", name: "Mongolia",       flag: "🇲🇳", regLabel: "Улсын бүртгэлийн №",    regHint: "7-digit number" },
  { code: "US", name: "United States",  flag: "🇺🇸", regLabel: "EIN",                   regHint: "XX-XXXXXXX" },
  { code: "KR", name: "South Korea",    flag: "🇰🇷", regLabel: "사업자등록번호",           regHint: "000-00-00000" },
  { code: "JP", name: "Japan",          flag: "🇯🇵", regLabel: "法人番号",               regHint: "13-digit number" },
  { code: "CN", name: "China",          flag: "🇨🇳", regLabel: "统一社会信用代码",         regHint: "18-char code" },
  { code: "DE", name: "Germany",        flag: "🇩🇪", regLabel: "Handelsregisternummer", regHint: "HRB 000000" },
  { code: "SG", name: "Singapore",      flag: "🇸🇬", regLabel: "UEN",                   regHint: "XXXXXXXXX" },
  { code: "AE", name: "UAE",            flag: "🇦🇪", regLabel: "Trade License No.",      regHint: "CN-XXXXXXXX" },
  { code: "AU", name: "Australia",      flag: "🇦🇺", regLabel: "ABN",                   regHint: "XX XXX XXX XXX" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", regLabel: "Companies House No.",   regHint: "XXXXXXXX" },
  { code: "OTHER", name: "Other",       flag: "🌐", regLabel: "Business Reg. Number",   regHint: "Country ID" },
];

const VERIFY_PATHS = {
  gov: {
    id: "gov", icon: "🏛️",
    title: { mn: "Засгийн газрын бүртгэл", en: "Government Registration", ko: "정부 등록" },
    desc:  { mn: "Бүртгэлийн дугаараар баталгаажуулах",   en: "Verify via official registration number",  ko: "공식 등록번호로 인증" },
  },
  ai: {
    id: "ai", icon: "🤖",
    title: { mn: "AI баталгаажуулалт",    en: "AI Verification",          ko: "AI 인증" },
    desc:  { mn: "Вэбсайт, имэйлээр баталгаажуулах",      en: "Verify via website, email & LinkedIn",     ko: "웹사이트·이메일·LinkedIn 인증" },
  },
  startup: {
    id: "startup", icon: "🚀",
    title: { mn: "Стартап бүртгэл",       en: "Startup Registration",     ko: "스타트업 등록" },
    desc:  { mn: "Хурдан бүртгэл — баримт бичиггүй",      en: "Quick signup — no documents required",     ko: "간편 등록 — 서류 불필요" },
  },
};

const TRUST_LEVELS = {
  basic:      { id: "basic",      label: { mn: "Үндсэн",       en: "Basic",       ko: "기본" },        color: "#8B8B8B", icon: "○", canContact: false },
  verified:   { id: "verified",   label: { mn: "Баталгаажсан", en: "Verified",    ko: "인증됨" },      color: "#4FA3FF", icon: "✓", canContact: true  },
  trusted:    { id: "trusted",    label: { mn: "Итгэлтэй",     en: "Trusted",     ko: "신뢰됨" },      color: "#3DDC97", icon: "★", canContact: true  },
  enterprise: { id: "enterprise", label: { mn: "Энтерпрайз",   en: "Enterprise",  ko: "엔터프라이즈" }, color: "#FFD23F", icon: "♦", canContact: true  },
};

function EmployerTrustBadge({ level, lang, size }) {
  const tl = TRUST_LEVELS[level] || TRUST_LEVELS.basic;
  const Lx = (o) => lang === "en" ? o.en : lang === "ko" ? o.ko : o.mn;
  const lbl = Lx(tl.label);
  if (size === "xs") return (
    <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 5, background: tl.color + "22", color: tl.color, border: `1px solid ${tl.color}44`, whiteSpace: "nowrap" }}>
      {tl.icon} {lbl}
    </span>
  );
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 8, background: tl.color + "18", color: tl.color, border: `1px solid ${tl.color}44`, whiteSpace: "nowrap" }}>
      {tl.icon} {lbl}
    </span>
  );
}

/* ── Company Verify Wizard ──────────────────────────── */

function CompanyVerifyWizard({ onSubmitted, onVerified, onBack, lang, initialData }) {

  const { t } = useLang();

  const [step, setStep] = React.useState(0); // 0=country+path, 1=basic info, 2=hiring needs, 3=submit

  const [country, setCountry] = React.useState(null);   // COUNTRIES entry

  const [verifyPath, setVerifyPath] = React.useState(null); // "gov"|"ai"|"startup"

  const [selectedTrustLevel, setSelectedTrustLevel] = React.useState("verified");

  const [fetching, setFetching] = React.useState(false);

  const [fetched, setFetched] = React.useState(null);

  // Step 1 fields

  const [form, setForm] = React.useState({
    name:        initialData?.name        || "",
    regNum:      initialData?.regNum      || "",
    email:       initialData?.email       || "",
    phone:       initialData?.phone       || "",
    hrName:      initialData?.hrName      || "",
    website:     initialData?.website     || "",
    linkedin:    initialData?.linkedin    || "",
    founderName: initialData?.founderName || "",
  });

  const [edited, setEdited] = React.useState({});

  // Step 2 fields

  const [industry, setIndustry] = React.useState("");

  const [profQuery, setProfQuery] = React.useState("");

  const [profResults, setProfResults] = React.useState([]);

  const [selectedProfs, setSelectedProfs] = React.useState([]);

  const [aiSuggestions, setAiSuggestions] = React.useState([]);

  const [aiLoading, setAiLoading] = React.useState(false);

  const [customProf, setCustomProf] = React.useState("");

  const [salaryMin, setSalaryMin] = React.useState("");

  const [salaryMax, setSalaryMax] = React.useState("");

  const [headcount, setHeadcount] = React.useState("");

  // Admin demo

  const [adminView, setAdminView] = React.useState(false);

  const [adminAction, setAdminAction] = React.useState(null);



  const L = (mn, en, ko) => lang === "en" ? en : lang === "ko" ? ko : mn;

  const fetchRegistry = (num) => {
    if (!num.trim()) return;
    setFetching(true);
    setTimeout(() => {
      const data = COMPANY_REGISTRY[num.trim()] || null;
      setFetching(false);
      if (data) {
        setFetched(data);
        setForm(f => ({ ...f, name: data.name, regNum: num.trim() }));
      } else {
        setFetched("notfound");
        setForm(f => ({ ...f, regNum: num.trim() }));
      }
    }, 900);
  };

  const updateF = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const onProfSearch = (q) => {
    setProfQuery(q);
    if (!q.trim()) { setProfResults([]); setAiSuggestions([]); return; }
    const matches = PROF_GROUPS.flatMap(g => g.cats)
      .filter(c => c.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 8);
    setProfResults(matches);
    setAiLoading(true);
    clearTimeout(window._aiTimer);
    window._aiTimer = setTimeout(() => {
      setAiSuggestions(getAISuggestions(q));
      setAiLoading(false);
    }, 600);
  };

  const toggleProf = (cat) => {
    setSelectedProfs(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const addCustom = () => {
    const val = profQuery.trim() || customProf.trim();
    if (!val) return;
    const label = val + (lang === "mn" ? " (бусад)" : lang === "ko" ? " (기타)" : " (custom)");
    if (!selectedProfs.includes(label)) setSelectedProfs(prev => [...prev, label]);
    setProfQuery(""); setCustomProf(""); setProfResults([]); setAiSuggestions([]);
  };

  const step1Valid = verifyPath === "gov"
    ? form.name.trim() && form.email.trim() && form.phone.trim()
    : verifyPath === "ai"
    ? form.website.trim() && form.email.trim()
    : verifyPath === "startup"
    ? form.name.trim() && form.founderName.trim() && form.email.trim()
    : false;
  const step2Valid = selectedProfs.length > 0;

  const fld = (field, label, type, placeholder) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>
        {label}
        {(field === "name" || field === "email" || field === "phone") && <span style={{ color: "#FF6B35" }}> *</span>}
        {fetched && fetched !== "notfound" && field === "name" && (
          <span style={{ marginLeft: 6, fontSize: 9, background: "rgba(61,220,151,0.15)", color: "#3DDC97", borderRadius: 5, padding: "1px 5px", fontWeight: 800 }}>AUTO</span>
        )}
      </label>
      <input type={type || "text"} value={form[field]} onChange={e => updateF(field, e.target.value)} placeholder={placeholder || ""}
        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, fontSize: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--ink)", outline: "none", boxSizing: "border-box" }} />
    </div>
  );

  if (step === 0) return (
    <div className="app" style={{ overflowY: "auto" }}>
      <Style />
      <header className="topbar topbar--solid" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer" }}><ChevronLeft size={22} /></button>
        <div style={{ fontWeight: 800, fontSize: 15 }}>🏢 {L("Компани бүртгэх", "Register Company", "회사 등록")}</div>
        <div />
      </header>
      <div style={{ padding: "72px 16px 48px" }}>
        {!country ? (
          <>
            <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 16, textAlign: "center" }}>
              {L("Улсаа сонгоно уу", "Select your country", "국가를 선택하세요")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {COUNTRIES.map(c => (
                <button key={c.code} onClick={() => { setCountry(c); if (c.code === "MN") { setVerifyPath("gov"); setStep(1); } }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 22 }}>{c.flag}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{c.name}</span>
                </button>
              ))}
            </div>
          </>
        ) : !verifyPath ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <button onClick={() => setCountry(null)} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}><ChevronLeft size={18} /></button>
              <span style={{ fontSize: 20 }}>{country.flag}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--ink)" }}>{country.name}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 16, textAlign: "center" }}>
              {L("Баталгаажуулах аргаа сонгоно уу", "Choose verification method", "인증 방법을 선택하세요")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {Object.values(VERIFY_PATHS).map(vp => (
                <button key={vp.id} onClick={() => { setVerifyPath(vp.id); setStep(1); }}
                  style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 28 }}>{vp.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)", marginBottom: 3 }}>
                      {L(vp.title.mn, vp.title.en, vp.title.ko)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--dim)", lineHeight: 1.5 }}>
                      {L(vp.desc.mn, vp.desc.en, vp.desc.ko)}
                    </div>
                  </div>
                  <ChevronRight size={16} style={{ color: "var(--dim)", marginLeft: "auto", flexShrink: 0, marginTop: 2 }} />
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );

  if (adminView) return (
    <div className="app" style={{ overflowY: "auto" }}>
      <Style />
      <header className="topbar topbar--solid" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setAdminView(false)} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer" }}><ChevronLeft size={20} /></button>
        <div style={{ fontWeight: 800, fontSize: 15 }}>🛡 Admin</div>
        <div />
      </header>
      <div style={{ padding: "16px", paddingTop: "calc(72px + env(safe-area-inset-top,0px))" }}>
        <AdminSection title={L("Компанийн мэдээлэл", "Company Info", "회사 정보")} color="#4FA3FF">
          {[
            [L("Нэр","Name","이름"), form.name],
            [L("Бүртгэл №","Reg #","등록 #"), form.regNum],
            [L("Вэбсайт","Website","웹사이트"), form.website],
            [L("LinkedIn","LinkedIn","LinkedIn"), form.linkedin],
            [L("Үүсгэн байгуулагч","Founder","설립자"), form.founderName],
            [L("Имэйл","Email","이메일"), form.email],
            [L("Утас","Phone","전화"), form.phone],
            [L("HR холбогч","HR Contact","HR 담당자"), form.hrName],
            [L("Улс","Country","국가"), country?.name],
            [L("Баталгаажуулах арга","Verify path","인증 방법"), verifyPath ? L(VERIFY_PATHS[verifyPath]?.title.mn, VERIFY_PATHS[verifyPath]?.title.en, VERIFY_PATHS[verifyPath]?.title.ko) : null],
          ].map(([lbl, v]) => v ? (
            <div key={lbl} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 12 }}>
              <span style={{ color: "var(--dim)" }}>{lbl}</span>
              <span style={{ color: "var(--ink)", fontWeight: 600, maxWidth: "60%", textAlign: "right", wordBreak: "break-all" }}>{v}</span>
            </div>
          ) : null)}
        </AdminSection>
        <AdminSection title={L("Ажилд авах мэдээлэл", "Hiring Needs", "인원 정보")} color="#FFD23F">
          <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 8 }}>{L("Салбар:", "Industry:", "산업:")} <b style={{ color: "var(--ink)" }}>{industry || "—"}</b></div>
          <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 8 }}>{L("Мэргэжлүүд:", "Professions:", "직업들:")} <b style={{ color: "var(--ink)" }}>{selectedProfs.join(", ") || "—"}</b></div>
          {headcount && <div style={{ fontSize: 13, color: "var(--dim)" }}>{L("Тоо:", "Count:", "인원:")} <b style={{ color: "var(--ink)" }}>{headcount}</b></div>}
        </AdminSection>
        {!adminAction ? (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                {L("Итгэлцлийн түвшин тогтоох", "Assign Trust Level", "신뢰 수준 지정")}
              </div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {["verified", "trusted", "enterprise"].map(lvl => {
                  const tl = TRUST_LEVELS[lvl];
                  const on = selectedTrustLevel === lvl;
                  return (
                    <button key={lvl} onClick={() => setSelectedTrustLevel(lvl)} style={{
                      padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: on ? 800 : 500, cursor: "pointer",
                      background: on ? tl.color + "22" : "rgba(255,255,255,0.05)",
                      border: `1.5px solid ${on ? tl.color : "rgba(255,255,255,0.1)"}`,
                      color: on ? tl.color : "var(--dim)",
                    }}>
                      {tl.icon} {L(tl.label.mn, tl.label.en, tl.label.ko)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
              <button onClick={() => setAdminAction("approved")} style={{ flex: 2, padding: "13px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#3DDC97,#2bc47f)", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
                ✓ {L("Зөвшөөрөх", "Approve", "승인")}
              </button>
              <button onClick={() => setAdminAction("rejected")} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1.5px solid rgba(255,68,68,0.4)", background: "rgba(255,68,68,0.08)", color: "#ff6b6b", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                ✗ {L("Татгалзах", "Reject", "거절")}
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "32px 0 48px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{adminAction === "approved" ? "✅" : "❌"}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: adminAction === "approved" ? "#3DDC97" : "#ff6b6b", marginBottom: 8 }}>
              {adminAction === "approved" ? L("Баталгаажлаа!", "Approved!", "승인됨!") : L("Татгалзлаа", "Rejected", "거절됨")}
            </div>
            {adminAction === "approved" && (
              <div style={{ marginBottom: 12 }}>
                <EmployerTrustBadge level={selectedTrustLevel} lang={lang} />
              </div>
            )}
            <button onClick={() => { setAdminAction(null); setAdminView(false); if (adminAction === "approved") onVerified({ ...form, trustLevel: selectedTrustLevel, country: country?.code, verifyPath }); }}
              style={{ marginTop: 16, padding: "12px 32px", borderRadius: 12, border: "none", background: adminAction === "approved" ? "#3DDC97" : "rgba(255,255,255,0.1)", color: adminAction === "approved" ? "#000" : "var(--ink)", fontWeight: 800, cursor: "pointer" }}>
              {adminAction === "approved" ? L("Дашборд руу →", "Dashboard →", "대시보드로 →") : L("Буцах", "Back", "뒤로")}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (step === 1) return (
    <div className="app" style={{ overflowY: "auto" }}>
      <Style />
      <header className="topbar topbar--solid" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => { setStep(0); setVerifyPath(null); }} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer" }}><ChevronLeft size={22} /></button>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 16 }}>{country?.flag || "🏢"}</span>
          <span style={{ fontWeight: 800, fontSize: 14 }}>{VERIFY_PATHS[verifyPath]?.icon || ""} {L("Компани мэдээлэл", "Company Info", "회사 정보")}</span>
        </div>
        <div style={{ fontSize: 11, color: "var(--dim)" }}>1 / 3</div>
      </header>
      <div style={{ padding: "72px 16px 40px" }}>
        {verifyPath === "gov" && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
              {country?.regLabel || L("Улсын бүртгэлийн дугаар", "Registration Number", "등록 번호")}
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={form.regNum} onChange={e => updateF("regNum", e.target.value)}
                placeholder={country?.regHint || "1234567"}
                style={{ flex: 1, padding: "10px 12px", borderRadius: 10, fontSize: 14, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--ink)", outline: "none" }} />
              {country?.code === "MN" && (
                <button onClick={() => fetchRegistry(form.regNum)} disabled={!form.regNum.trim() || fetching}
                  style={{ padding: "0 16px", borderRadius: 10, border: "none", background: form.regNum.trim() ? "#FF6B35" : "rgba(255,255,255,0.08)", color: form.regNum.trim() ? "#fff" : "var(--dim)", fontWeight: 700, fontSize: 13, cursor: form.regNum.trim() ? "pointer" : "default", whiteSpace: "nowrap" }}>
                  {fetching ? "…" : L("Хайх", "Fetch", "검색")}
                </button>
              )}
            </div>
          {fetched === "notfound" && <p style={{ fontSize: 12, color: "#FF6B35", marginTop: 5 }}>{L("Бүртгэл олдсонгүй — гараар бөлгөнө үү.", "Not found — fill in manually.", "입력하세요.")}</p>}
          {fetched && fetched !== "notfound" && <p style={{ fontSize: 12, color: "#3DDC97", marginTop: 5 }}>✓ {L("Автоматаар бөлгөгдлээ. Шалгаад үргэлжүүлэнә үү.", "Auto-filled. Please review.", "자동 입력됨.")}</p>}
          {country?.code === "MN" && <p style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>{L("Туршихын тулд: 1234567, 7654321", "Try: 1234567, 7654321", "테스트: 1234567, 7654321")}</p>}
        </div>
        )}
        {(verifyPath === "gov" || verifyPath === "startup") && fld("name", L("Компанийн нэр", "Company Name", "회사명"))}
        {verifyPath === "startup" && fld("founderName", L("Үүсгэн байгуулагчийн нэр", "Founder Name", "설립자 이름"))}
        {verifyPath === "ai" && fld("website", L("Вэбсайт *", "Company Website *", "회사 웹사이트 *"), "url", "https://company.com")}
        {verifyPath === "ai" && fld("linkedin", L("LinkedIn хуудас", "LinkedIn Company Page", "LinkedIn 페이지"), "url", "https://linkedin.com/company/...")}
        {fld("email",  L("Компанийн имэйл *", "Company Email *",   "회사 이메일 *"), "email")}
        {(verifyPath === "gov" || verifyPath === "ai") && fld("phone", L("Утасны дугаар", "Phone Number", "전화번호"), "tel")}
        {verifyPath === "gov" && fld("hrName", L("HR холбогч нэр",  "HR Contact Name", "HR 담당자"))}
        {verifyPath === "startup" && fld("website", L("Вэбсайт (заавал биш)", "Website (optional)", "웹사이트 (선택사항)"), "url", "https://")}
        <button onClick={() => { if (step1Valid) setStep(2); }} disabled={!step1Valid}
          style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: step1Valid ? "linear-gradient(135deg,#FF6B35,#e8542a)" : "rgba(255,255,255,0.08)", color: step1Valid ? "#fff" : "var(--dim)", fontWeight: 800, fontSize: 16, cursor: step1Valid ? "pointer" : "default", marginTop: 8 }}>
          {L("Үргэлжүүлэх →", "Continue →", "계속 →")}
        </button>
      </div>
    </div>
  );

  if (step === 2) return (
    <div className="app" style={{ overflowY: "auto" }}>
      <Style />
      <header className="topbar topbar--solid" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setStep(1)} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer" }}><ChevronLeft size={22} /></button>
        <div style={{ fontWeight: 800, fontSize: 15 }}>{L("Ажилд авах мэдээлэл", "Hiring Needs", "인원 정보")}</div>
        <div style={{ fontSize: 11, color: "var(--dim)" }}>2 / 3</div>
      </header>
      <div style={{ padding: "72px 16px 40px" }}>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            {L("Салбар *", "Industry *", "산업 *")}
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {PROF_GROUPS.map(g => {
              const lbl = g.label[lang] || g.label.mn;
              const on = industry === lbl;
              return (
                <button key={lbl} onClick={() => setIndustry(lbl)} style={{
                  padding: "7px 13px", borderRadius: 99, fontSize: 12.5, fontWeight: on ? 700 : 500, cursor: "pointer",
                  background: on ? "rgba(255,107,53,0.2)" : "rgba(255,255,255,0.06)",
                  border: "1px solid " + (on ? "rgba(255,107,53,0.5)" : "rgba(255,255,255,0.1)"),
                  color: on ? "#FF6B35" : "var(--dim)", transition: "all .12s",
                }}>
                  {on && "✓ "}{lbl}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            {L("Мэргэжл хайх *", "Search Profession *", "직업 검색 *")}
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "9px 13px", marginBottom: 8 }}>
            <Search size={15} style={{ color: "var(--dim)", flexShrink: 0 }} />
            <input value={profQuery} onChange={e => onProfSearch(e.target.value)}
              placeholder={L("Жишээ: Гагнуурчин, Жолооч...", "e.g. Welder, Driver...", "예: 용접공, 운전사...")}
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--ink)", fontSize: 14 }} />
            {profQuery && <button onClick={() => { setProfQuery(""); setProfResults([]); setAiSuggestions([]); }} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", padding: 0 }}><X size={14} /></button>}
          </div>

          {profResults.length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
              {profResults.map(cat => (
                <button key={cat} onClick={() => { toggleProf(cat); setProfQuery(""); setProfResults([]); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "11px 14px", background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 14, color: "var(--ink)" }}>{cat}</span>
                  <span style={{ fontSize: 12, color: "#3DDC97", fontWeight: 700 }}>+ {L("Нэмэх", "Add", "추가")}</span>
                </button>
              ))}
              {!profResults.some(c => c.toLowerCase() === profQuery.toLowerCase()) && (
                <button onClick={addCustom}
                  style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "11px 14px", background: "rgba(255,107,53,0.06)", border: "none", cursor: "pointer", textAlign: "left" }}>
                  <Plus size={15} color="#FF6B35" />
                  <span style={{ fontSize: 13.5, color: "#FF6B35", fontWeight: 700 }}>
                    {L("Бусад мэргэжл нэмэх: “" + profQuery + "”", "Add “" + profQuery + "” as custom", "“" + profQuery + "” 추가")}
                  </span>
                </button>
              )}
            </div>
          )}

          {profQuery.trim().length >= 2 && profResults.length === 0 && !aiLoading && (
            <button onClick={addCustom}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "12px 14px", background: "rgba(255,107,53,0.08)", border: "1px dashed rgba(255,107,53,0.4)", borderRadius: 12, cursor: "pointer", marginBottom: 10 }}>
              <Plus size={16} color="#FF6B35" />
              <span style={{ fontSize: 14, color: "#FF6B35", fontWeight: 700 }}>
                + {L("“" + profQuery + "” нэмэх", "Add “" + profQuery + "”", "“" + profQuery + "” 추가")}
              </span>
            </button>
          )}

          {(aiSuggestions.length > 0 || aiLoading) && (
            <div style={{ background: "rgba(180,136,255,0.07)", border: "1px solid rgba(180,136,255,0.2)", borderRadius: 14, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#B488FF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={12} /> {L("AI санал болгосон ойролцоо мэргэжлүүд", "AI suggested related professions", "AI 추청 관련 직업")}
              </div>
              {aiLoading ? (
                <div style={{ fontSize: 13, color: "var(--dim)" }}>{L("Хайж байна…", "Searching…", "검색 중…")}</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {aiSuggestions.map(s => {
                    const on = selectedProfs.includes(s);
                    return (
                      <button key={s} onClick={() => toggleProf(s)} style={{
                        padding: "6px 12px", borderRadius: 99, fontSize: 12.5, fontWeight: on ? 700 : 500, cursor: "pointer",
                        background: on ? "rgba(180,136,255,0.2)" : "rgba(180,136,255,0.08)",
                        border: "1px solid " + (on ? "rgba(180,136,255,0.5)" : "rgba(180,136,255,0.2)"),
                        color: on ? "#B488FF" : "var(--dim)", transition: "all .12s",
                      }}>
                        {on && "✓ "}{s}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {selectedProfs.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              {L("Сонгосон мэргэжлүүд", "Selected", "선택된 직업")} ({selectedProfs.length})
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {selectedProfs.map(p => (
                <span key={p} onClick={() => toggleProf(p)} style={{
                  display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 99,
                  background: "rgba(61,220,151,0.12)", border: "1px solid rgba(61,220,151,0.35)",
                  color: "#3DDC97", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                }}>
                  {p} <X size={11} />
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            {L("Цалингийн дүр (₮)", "Salary Budget (₮)", "급여 예산 (₮)")}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder={L("Доод: 1,500,000", "Min: 1,500,000", "최소")}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, fontSize: 13, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--ink)", outline: "none" }} />
            <input value={salaryMax} onChange={e => setSalaryMax(e.target.value)} placeholder={L("Дээд: 3,000,000", "Max: 3,000,000", "최대")}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, fontSize: 13, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "var(--ink)", outline: "none" }} />
          </div>
        </div>

        <div style={{ marginBottom: 22 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            {L("Хэдэн хүн ажилд авах вэ?", "Workers needed?", "필요 인원수")}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {["1–5", "6–20", "21–50", "50+"].map(n => (
              <button key={n} onClick={() => setHeadcount(n)} style={{
                flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: headcount === n ? 800 : 500, cursor: "pointer",
                background: headcount === n ? "rgba(255,107,53,0.2)" : "rgba(255,255,255,0.05)",
                border: "1px solid " + (headcount === n ? "rgba(255,107,53,0.5)" : "rgba(255,255,255,0.1)"),
                color: headcount === n ? "#FF6B35" : "var(--dim)", transition: "all .12s",
              }}>{n}</button>
            ))}
          </div>
        </div>

        <button onClick={() => { if (step2Valid) setStep(3); }} disabled={!step2Valid}
          style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", background: step2Valid ? "linear-gradient(135deg,#FF6B35,#e8542a)" : "rgba(255,255,255,0.08)", color: step2Valid ? "#fff" : "var(--dim)", fontWeight: 800, fontSize: 16, cursor: step2Valid ? "pointer" : "default" }}>
          {L("Үргэлжүүлэх →", "Continue →", "계속 →")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="app">
      <Style />
      <header className="topbar topbar--solid" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setStep(2)} style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer" }}><ChevronLeft size={22} /></button>
        <div style={{ fontWeight: 800, fontSize: 15 }}>{L("Хянах & Илгээх", "Review & Submit", "검토 & 제출")}</div>
        <div style={{ fontSize: 11, color: "var(--dim)" }}>3 / 3</div>
      </header>
      <div style={{ padding: "72px 16px 40px" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "16px", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>🏢 {L("Компани", "Company", "회사")}</div>
          {[
            [L("Улс","Country","국가"), country?.name ? `${country.flag} ${country.name}` : null],
            [L("Нэр","Name","이름"), form.name],
            [L("Үүсгэн байгуулагч","Founder","설립자"), form.founderName],
            [L("Бүртгэл №","Reg #","등록 #"), form.regNum],
            [L("Вэбсайт","Website","웹사이트"), form.website],
            [L("Имэйл","Email","이메일"), form.email],
            [L("Утас","Phone","전화"), form.phone],
          ].map(([lbl,val]) => val ? (
            <div key={lbl} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13 }}>
              <span style={{ color: "var(--dim)" }}>{lbl}</span>
              <span style={{ color: "var(--ink)", fontWeight: 600, maxWidth: "58%", textAlign: "right", wordBreak: "break-all" }}>{val}</span>
            </div>
          ) : null)}
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "16px", marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>💼 {L("Ажилд авах", "Hiring", "인원")}</div>
          <div style={{ fontSize: 13, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ color: "var(--dim)" }}>{L("Мэргэжлүүд", "Professions", "직업")}: </span>
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>{selectedProfs.join(", ")}</span>
          </div>
          {headcount && <div style={{ fontSize: 13, padding: "6px 0" }}>
            <span style={{ color: "var(--dim)" }}>{L("Тоо", "Count", "인원")}: </span>
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>{headcount}</span>
          </div>}
        </div>
        <div style={{ background: "rgba(61,220,151,0.07)", border: "1px solid rgba(61,220,151,0.2)", borderRadius: 14, padding: "12px 15px", marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "#3DDC97", fontWeight: 700, marginBottom: 4 }}>📄 {L("Баримт бичиг — нэмэлт", "Documents — optional", "서류 — 선택사항")}</div>
          <div style={{ fontSize: 12.5, color: "var(--dim)", lineHeight: 1.6 }}>
            {L("Баримт бичгийг дараа нь оруулж болно. Эхний шалгалт компанийн мэдээлэл болон Админ-ийн шийдвэрт үндэслэнэ.", "Documents can be uploaded later. Initial review is based on company information and Admin decision.", "서류는 나중에 업로드할 수 있습니다.")}
          </div>
        </div>
        <div style={{ background: "rgba(255,210,63,0.07)", border: "1px solid rgba(255,210,63,0.2)", borderRadius: 14, padding: "12px 15px", marginBottom: 22 }}>
          <div style={{ fontSize: 12.5, color: "#FFD23F", lineHeight: 1.6 }}>
            ⚡ {L("Илгээсний дараа нэр дэвшигчдийг үзэх боломжтой болно. Холбоо барих эрхийг Admin баталгаажуулсаны дараа авна.", "After submit you can browse candidates. Contact access granted after Admin approval.", "제출 후 후보자 탐색 가능. 연락 권한은 관리자 승인 후 부여됩니다.")}
          </div>
        </div>
        <button onClick={() => onSubmitted(form)}
          style={{ width: "100%", padding: "15px 0", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#FF6B35,#e8542a)", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", marginBottom: 12 }}>
          🚀 {L("Илгээх — Нэр дэвшигчдийг үзэх →", "Submit — Start Browsing →", "제출 — 탐색 시작 →")}
        </button>
        <div style={{ background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.15)", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#FF6B35", fontWeight: 800, marginBottom: 5 }}>🎭 DEMO</div>
          <button onClick={() => setAdminView(true)} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: "rgba(255,107,53,0.15)", color: "#FF6B35", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
            🛡 {L("Admin хянах панель", "Admin Review Panel", "관리자 패널")}
          </button>
        </div>
      </div>
    </div>
  );
}



// small helper sub-components for admin panel

function AdminSection({ title, color, children }) {

  return (

    <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${color}22`, borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>

      <div style={{ fontSize: 12, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>{title}</div>

      {children}

    </div>

  );

}

function Row({ label, orig, edited }) {

  return (

    <div style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 12 }}>

      <span style={{ color: "var(--dim)", textTransform: "capitalize" }}>{label}: </span>

      <span style={{ color: "var(--ink)", fontWeight: 600 }}>{orig || "—"}</span>

      {edited && <span style={{ marginLeft: 8, color: "#FFD23F" }}>→ {edited} <span style={{ fontSize: 10, opacity: 0.7 }}>(edited)</span></span>}

    </div>

  );

}

function SimpleRow({ label, value }) {

  return (

    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 12 }}>

      <span style={{ color: "var(--dim)" }}>{label}</span>

      <span style={{ color: "var(--ink)", fontWeight: 600 }}>{value}</span>

    </div>

  );

}



/* ── Employer Profile (glassmorphism · black + orange) ───────── */
function EmployerProfilePanel({
  data, verified, subscribed, lang, logoInputRef, onLogoPick,
  onEditInfo, onOpenFinance, onOpenInsights, onUpgrade, onLogout, onReset,
}) {
  const L = (mn, en, ko) => lang === "en" ? en : lang === "ko" ? ko : mn;
  const d = data || {};
  const trust = TRUST_LEVELS[d.trustLevel] || null;

  const rows = [
    { ic: "🏢", k: L("Компанийн нэр", "Company", "회사"),          v: d.name },
    { ic: "🔢", k: L("Бүртгэлийн дугаар", "Reg number", "등록번호"), v: d.regNum },
    { ic: "✉️", k: L("Имэйл", "Email", "이메일"),                   v: d.email },
    { ic: "📞", k: L("Утас", "Phone", "전화"),                      v: d.phone },
    { ic: "👤", k: L("HR холбогч", "HR contact", "HR 담당자"),      v: d.hrName },
    { ic: "🌐", k: L("Вэбсайт", "Website", "웹사이트"),              v: d.website },
    { ic: "💼", k: L("Салбар", "Industry", "산업"),                 v: d.industry },
    { ic: "👥", k: L("Ажилтны тоо", "Headcount", "직원 수"),         v: d.headcount },
  ].filter(r => r.v);

  const salary = (d.salaryMin || d.salaryMax)
    ? `₮${Number(d.salaryMin || 0).toLocaleString()} – ₮${Number(d.salaryMax || 0).toLocaleString()}`
    : null;

  const tiles = [
    { ic: "💰", g: "linear-gradient(140deg,#FFB03D,#FF6B35)", t: L("Санхүү", "Finance", "재무"), s: subscribed ? "PRO" : L("Үнэгүй", "Free", "무료"), on: onOpenFinance },
    { ic: "✏️", g: "linear-gradient(140deg,#FF8A3D,#E85400)", t: L("Мэдээлэл засах", "Edit info", "정보 수정"), s: L("Профайл", "Profile", "프로필"), on: onEditInfo },
    { ic: "📊", g: "linear-gradient(140deg,#B488FF,#7C4DFF)", t: L("Ойлголт", "Insights", "인사이트"), s: "PRO", on: onOpenInsights },
  ];

  return (
    <div className="gp">

      <div className="gcard gp__hero">
        <div className="gp__ava">
          {d.logo ? <img src={d.logo} alt="" /> : <span style={{ fontSize: 40 }}>🏢</span>}
          <button className="gp__edit" onClick={() => logoInputRef?.current?.click()} aria-label="Upload logo">✎</button>
          <input ref={logoInputRef} type="file" accept="image/*" onChange={onLogoPick} style={{ display: "none" }} />
        </div>

        <div className="gp__name">{d.name || L("Компани", "Company", "회사")}</div>

        <div className="gp__badge" style={{
          background: verified ? "rgba(61,220,151,.13)" : "rgba(255,210,63,.13)",
          border: `1px solid ${verified ? "rgba(61,220,151,.35)" : "rgba(255,210,63,.35)"}`,
          color: verified ? "#3DDC97" : "#FFD23F",
        }}>
          {verified ? "✓ " : "● "}
          {verified ? L("Баталгаажсан", "Verified", "인증됨") : L("Хянагдаж байна", "Pending review", "검토 중")}
          {trust && verified ? ` · ${L(trust.label.mn, trust.label.en, trust.label.ko)}` : ""}
        </div>

        {!subscribed && (
          <button onClick={onUpgrade} style={{
            marginTop: 16, width: "100%", padding: "13px", borderRadius: 15, border: "none",
            background: "linear-gradient(135deg,#FF8A3D,#E85400)", color: "#fff",
            fontWeight: 800, fontSize: 14.5, cursor: "pointer",
            boxShadow: "0 8px 22px rgba(255,107,53,.38)",
          }}>👑 {L("PRO болох", "Go PRO", "PRO 시작")}</button>
        )}
      </div>

      <div className="gp__lbl">{L("Хурдан үйлдэл", "Quick actions", "빠른 작업")}</div>
      <div className="ggrid">
        {tiles.map((t, i) => (
          <div key={i} className="gtile" onClick={t.on}>
            <div className="gtile__ic" style={{ background: t.g }}>{t.ic}</div>
            <div className="gtile__t">{t.t}</div>
            <div className="gtile__s">{t.s}</div>
          </div>
        ))}
      </div>

      <div className="gp__lbl">{L("Компанийн мэдээлэл", "Company details", "회사 정보")}</div>
      <div className="gcard" style={{ overflow: "hidden" }}>
        {rows.length ? rows.map((r, i) => (
          <div className="grow" key={i}>
            <div className="grow__ic">{r.ic}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="grow__k">{r.k}</div>
              <div className="grow__v">{r.v}</div>
            </div>
          </div>
        )) : (
          <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,.45)", fontSize: 13 }}>
            {L("Мэдээлэл бөглөөгүй байна", "No details yet", "정보 없음")}
          </div>
        )}
      </div>

      {(salary || (d.selectedProfs?.length)) && (
        <>
          <div className="gp__lbl">{L("Ажилд авах хэрэгцээ", "Hiring needs", "채용 수요")}</div>
          <div className="gcard" style={{ padding: 16 }}>
            {salary && (
              <div style={{ marginBottom: d.selectedProfs?.length ? 12 : 0 }}>
                <div className="grow__k">{L("Цалингийн хүрээ", "Salary range", "급여 범위")}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#FF8A3D", marginTop: 2 }}>{salary}</div>
              </div>
            )}
            {!!d.selectedProfs?.length && (
              <>
                <div className="grow__k" style={{ marginBottom: 7 }}>{L("Хайж буй мэргэжил", "Roles", "직무")}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {d.selectedProfs.map((p, i) => (
                    <span key={i} style={{
                      fontSize: 11.5, fontWeight: 700, color: "#FF8A3D",
                      background: "rgba(255,107,53,.12)", border: "1px solid rgba(255,107,53,.28)",
                      borderRadius: 9, padding: "5px 11px",
                    }}>{p}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div className="gp__lbl">{L("Бүртгэл", "Account", "계정")}</div>
      <div className="gcard" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 9 }}>
        <button onClick={onLogout} style={{
          width: "100%", padding: "12px", borderRadius: 13, cursor: "pointer",
          background: "rgba(255,80,80,.10)", border: "1px solid rgba(255,80,80,.28)",
          color: "#FF6B6B", fontWeight: 800, fontSize: 14,
        }}>{L("Гарах", "Logout", "로그아웃")}</button>
        <button onClick={onReset} style={{
          width: "100%", padding: "9px", borderRadius: 12, cursor: "pointer",
          background: "transparent", border: "1px solid rgba(255,255,255,.09)",
          color: "rgba(255,255,255,.45)", fontWeight: 600, fontSize: 12,
        }}>{L("Демо өгөгдөл устгах", "Reset demo data", "데모 초기화")}</button>
        <div style={{ textAlign: "center", fontSize: 10.5, color: "rgba(255,255,255,.28)", marginTop: 2 }}>
          SwipeHire · Beta
        </div>
        <LegalLinks lang={lang} />
      </div>
    </div>
  );
}

function FinancePanel({ subscribed, onSubscribe, stages, planId = "free" }) {

  const { t, lang } = useLang();

  const hiredCount = Object.values(stages).filter(s => s === "hired").length;

  const avgSalary = hiredCount > 0

    ? CANDIDATES.filter(c => stages[c.id] === "hired").reduce((s, c) => s + c.salary, 0) / hiredCount

    : 0;

  const totalSpend = INVOICES.filter(i => i.paid).reduce((s, i) => s + i.amount, 0);

  const costPerHire = hiredCount > 0 ? Math.round(totalSpend / hiredCount) : 0;



  const StatCard = ({ label, value, sub, color }) => (

    <div style={{

      flex: "1 1 140px", background: "rgba(255,255,255,0.04)",

      border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: 16,

      padding: "14px 16px",

    }}>

      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dim)", letterSpacing: ".5px", marginBottom: 6 }}>{label}</div>

      <div style={{ fontSize: 22, fontWeight: 900, color: color || "var(--ink)", fontFamily: "'Barlow Condensed',sans-serif" }}>{value}</div>

      {sub && <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 2 }}>{sub}</div>}

    </div>

  );



  // Demo recruitment analytics (mock-derived; clearly labelled Demo data).
  const monthlyBars = [
    { label: "1-р", value: 0 }, { label: "2-р", value: 0 }, { label: "3-р", value: 0 },
    { label: "4-р", value: 49999 }, { label: "5-р", value: 49999 }, { label: "6-р", value: 49999 },
  ];

  return (
    <div style={{ padding: "16px 16px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Subscription — this company's own plan (catalog + dev scenario) */}
      <EmployerBillingOverview
        lang={lang}
        planId={planId}
        onUpgrade={onSubscribe}   /* opens EmployerPlanSheet via showEmpPaywall */
        onRenew={onSubscribe}
      />

      {/* 2. Plan Usage — allowances from catalog; usage not tracked */}
      <EmployerUsagePanel lang={lang} planId={planId} />

      {/* 3. Payments & Invoices — honest empty states, no fake production data */}
      <EmployerInvoicePanel lang={lang} />

      {/* 4. Recruitment Analytics — demo metrics, kept separate from billing */}
      <RecruitmentAnalyticsPanel
        lang={lang}
        totalSpend={totalSpend}
        hiredCount={hiredCount}
        costPerHire={costPerHire}
        avgSalary={avgSalary}
        monthlyBars={monthlyBars}
      />
    </div>
  );
}




// ── Exit Survey Modal ──────────────────────────────────────────────────────
function ExitSurveyModal({ company, onClose, onSubmit }) {
  const { lang } = useLang();
  const L = (mn, en, ko) => lang === "en" ? en : lang === "ko" ? ko : mn;
  const [selected, setSelected] = React.useState([]);
  const [submitted, setSubmitted] = React.useState(false);

  const toggle = (r) => setSelected(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r]);

  const submit = () => {
    setSubmitted(true);
    setTimeout(() => { onSubmit(selected); onClose(); }, 1800);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", background: "var(--bg)", borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", maxHeight: "85vh", overflowY: "auto" }}>
        {submitted ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🙏</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: "var(--ink)", marginBottom: 8 }}>
              {L("Баярлалаа!", "Thank you!", "감사합니다!")}
            </div>
            <div style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.6 }}>
              {L("Таны хариулт нэрийгүйгээр хадгалагдлаа.", "Your feedback was saved anonymously.", "익명으로 저장되었습니다.")}
            </div>
          </div>
        ) : (
          <>
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 2, margin: "0 auto 20px" }} />
            <div style={{ fontSize: 11, fontWeight: 800, color: "#B488FF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              🔒 {L("Нэрийгүй судалгаа", "Anonymous Survey", "익명 설문")}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ink)", marginBottom: 4 }}>
              {L("Та яагаад явсан бэ?", "Why did you leave?", "왜 떠났나요?")}
            </div>
            <div style={{ fontSize: 13, color: "var(--dim)", marginBottom: 18, lineHeight: 1.5 }}>
              {company && <><b style={{ color: "var(--ink)" }}>{company}</b> — </>}
              {L("Таны хариулт ажил олгогчид тань мэдэгдэхгүй.", "Your response will never be shared with the employer.", "고용주에게 공유되지 않습니다.")}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 24 }}>
              {EXIT_REASONS.map(r => {
                const on = selected.includes(r);
                const label = lang === "mn" ? EXIT_REASON_MN[r] : r;
                return (
                  <button key={r} onClick={() => toggle(r)} style={{
                    padding: "9px 15px", borderRadius: 99, fontSize: 13, fontWeight: on ? 700 : 500, cursor: "pointer",
                    background: on ? "rgba(180,136,255,0.2)" : "rgba(255,255,255,0.06)",
                    border: "1.5px solid " + (on ? "rgba(180,136,255,0.6)" : "rgba(255,255,255,0.1)"),
                    color: on ? "#B488FF" : "var(--dim)", transition: "all .12s",
                  }}>
                    {on && "✓ "}{label}
                  </button>
                );
              })}
            </div>
            <button onClick={submit} disabled={selected.length === 0}
              style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", fontWeight: 800, fontSize: 15, cursor: selected.length ? "pointer" : "default",
                background: selected.length ? "linear-gradient(135deg,#B488FF,#8B5CF6)" : "rgba(255,255,255,0.08)",
                color: selected.length ? "#fff" : "var(--dim)" }}>
              {L("Илгээх", "Submit", "제출")}
            </button>
            <button onClick={onClose} style={{ width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 14, border: "none", background: "none", color: "var(--dim)", fontSize: 13, cursor: "pointer" }}>
              {L("Алгасах", "Skip", "건너뛰기")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Score Stars ─────────────────────────────────────────────────────────────
function ScoreStars({ score }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: 16, color: i <= Math.floor(score) ? "#FFD23F" : i - 0.5 <= score ? "#FFD23F" : "rgba(255,210,63,0.25)" }}>
          {i <= Math.floor(score) ? "★" : i - 0.5 <= score ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

// ── Animated Progress Bar ────────────────────────────────────────────────────
function InsightBar({ pct, color, animated }) {
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => { const t = setTimeout(() => setWidth(pct), 80); return () => clearTimeout(t); }, [pct]);
  return (
    <div style={{ height: 7, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", borderRadius: 99, background: color || "var(--acc)", width: width + "%", transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)" }} />
    </div>
  );
}

// ── Trend Sparkline (SVG) ────────────────────────────────────────────────────
function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const W = 120, H = 36;
  const min = Math.min(...data) - 5;
  const max = Math.max(...data) + 5;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / (max - min)) * H;
    return `${x},${y}`;
  }).join(" ");
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const up = last >= prev;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color || "#3DDC97"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length-1)/(data.length-1)*W} cy={H-((last-min)/(max-min))*H} r="3.5" fill={color || "#3DDC97"} />
    </svg>
  );
}

// ── WorkplaceInsightsPanel ──────────────────────────────────────────────────
function WorkplaceInsightsPanel({ companyName, onClose }) {
  const { lang } = useLang();
  const L = (mn, en, ko) => lang === "en" ? en : lang === "ko" ? ko : mn;
  const data = getWorkplaceData(companyName);

  const glass = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 18,
    padding: "16px 18px",
    backdropFilter: "blur(12px)",
  };

  const sectionTitle = (icon, label) => (
    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
      <span>{icon}</span> {label}
    </div>
  );

  if (!data) return (
    <div style={{ padding: "60px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
        {L("Мэдээлэл хүрэлцэхгүй байна", "Not enough data yet", "데이터 부족")}
      </div>
      <div style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.6 }}>
        {L("Дор хаяж 10 ажилтны хариулт хэрэгтэй.", "At least 10 employee responses are needed.", "최소 10개의 응답이 필요합니다.")}
      </div>
    </div>
  );

  if (data.responses < 10) return (
    <div style={{ padding: "60px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
        {L("Илүү их хариулт шаардлагатай", "More employee feedback is needed", "더 많은 피드백 필요")}
      </div>
      <div style={{ fontSize: 13, color: "var(--dim)" }}>{data.responses} / 10 {L("хариулт", "responses", "응답")}</div>
    </div>
  );

  const retentionColor = data.retention >= 80 ? "#3DDC97" : data.retention >= 65 ? "#FFD23F" : "#FF6B6B";

  return (
    <div style={{ padding: "0 16px 40px", overflowY: "auto", height: "100%" }}>
      {/* Header */}
      <div style={{ textAlign: "center", padding: "24px 0 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dim)", marginBottom: 6 }}>{companyName}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 4 }}>
          <ScoreStars score={data.score} />
          <span style={{ fontSize: 28, fontWeight: 900, color: "var(--ink)" }}>{data.score}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--dim)" }}>{L("Ажлын байрны үнэлгээ", "Overall Workplace Score", "직장 점수")} · {data.responses} {L("хариулт", "responses", "responses")}</div>
        {data.riskAlert && (
          <div style={{ margin: "14px auto 0", maxWidth: 340, padding: "10px 16px", borderRadius: 12, background: "rgba(255,168,0,0.1)", border: "1px solid rgba(255,168,0,0.3)", fontSize: 13, color: "#FFA800", fontWeight: 600 }}>
            ⚠️ {L("Сүүлийн ажилчдын эргэлт дундажаас өндөр байна.", "Recent employee turnover is higher than usual.", "최근 이직률이 평균보다 높습니다.")}
          </div>
        )}
      </div>

      {/* Key metrics row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        {[
          { icon: "🔄", label: L("Хадгалалт", "Retention", "유지율"), value: data.retention + "%", color: retentionColor },
          { icon: "📅", label: L("Дундаж хугацаа", "Avg Duration", "평균 기간"), value: data.avgDuration + " " + L("жил", "yrs", "년"), color: "#4FA3FF" },
          { icon: "👥", label: L("Хариулт", "Responses", "응답"), value: data.responses, color: "#B488FF" },
        ].map(m => (
          <div key={m.label} style={{ ...glass, flex: 1, textAlign: "center", padding: "14px 8px" }}>
            <div style={{ fontSize: 20, marginBottom: 5 }}>{m.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: m.color }}>{m.value}</div>
            <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Retention trend */}
      <div style={{ ...glass, marginBottom: 14 }}>
        {sectionTitle("📈", L("Хадгалалтын чиг хандлага", "Retention Trend", "유지율 추세"))}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Sparkline data={data.trendMonths} color={retentionColor} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--dim)" }}>{L("Салбарын дундаж", "Industry avg", "업계 평균")}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dim)" }}>{data.industryRetention}%</div>
            <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 4 }}>{L("Энэ компани", "This company", "이 회사")}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: retentionColor }}>{data.retention}%</div>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <InsightBar pct={data.retention} color={retentionColor} />
        </div>
      </div>

      {/* Top reasons for leaving */}
      <div style={{ ...glass, marginBottom: 14 }}>
        {sectionTitle("🚪", L("Явах гол шалтгаан", "Top Reasons for Leaving", "퇴사 주요 이유"))}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.reasons.map(r => {
            const label = lang === "mn" ? (EXIT_REASON_MN[r.label] || r.label) : r.label;
            const barColor = r.pct >= 30 ? "#FF6B6B" : r.pct >= 20 ? "#FFD23F" : "#4FA3FF";
            return (
              <div key={r.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: "var(--ink)" }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{r.pct}%</span>
                </div>
                <InsightBar pct={r.pct} color={barColor} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths */}
      <div style={{ ...glass, marginBottom: 14 }}>
        {sectionTitle("✅", L("Давуу тал", "Strengths", "강점"))}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {data.strengths.map(s => (
            <span key={s} style={{ padding: "7px 13px", borderRadius: 99, fontSize: 12.5, fontWeight: 600, background: "rgba(61,220,151,0.12)", border: "1px solid rgba(61,220,151,0.3)", color: "#3DDC97" }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Improvements */}
      <div style={{ ...glass, marginBottom: 14 }}>
        {sectionTitle("🔧", L("Сайжруулах чиглэл", "Areas for Improvement", "개선 영역"))}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {data.improvements.map(s => (
            <span key={s} style={{ padding: "7px 13px", borderRadius: 99, fontSize: 12.5, fontWeight: 600, background: "rgba(255,168,0,0.1)", border: "1px solid rgba(255,168,0,0.25)", color: "#FFA800" }}>{s}</span>
          ))}
        </div>
      </div>

      {/* AI Summary */}
      <div style={{ ...glass, marginBottom: 14, background: "rgba(180,136,255,0.07)", border: "1px solid rgba(180,136,255,0.2)" }}>
        {sectionTitle("🤖", L("AI дүгнэлт", "AI Summary", "AI 요약"))}
        <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.7, fontStyle: "italic" }}>
          "{data.aiSummary}"
        </div>
      </div>

      {/* Privacy note */}
      <div style={{ textAlign: "center", fontSize: 11, color: "var(--dim)", lineHeight: 1.6, padding: "8px 0" }}>
        🔒 {L("Бүх мэдээлэл нэрийгүй бөгөөд нэгтгэгдсэн байна. Ажилтны нэр, хувийн мэдээлэл харагдахгүй.", "All data is anonymous and aggregated. No individual employee information is shown.", "모든 데이터는 익명 집계입니다.")}
      </div>
    </div>
  );
}

// ── Employer Insights Dashboard ─────────────────────────────────────────────
function EmployerInsightsDashboard({ companyName }) {
  const { lang } = useLang();
  const L = (mn, en, ko) => lang === "en" ? en : lang === "ko" ? ko : mn;
  const data = getWorkplaceData(companyName);

  const glass = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 18,
    padding: "16px 18px",
    marginBottom: 14,
    backdropFilter: "blur(12px)",
  };

  if (!data) return (
    <div style={{ padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
        {L("Мэдээлэл хүрэлцэхгүй", "Not enough data", "데이터 부족")}
      </div>
      <div style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.6 }}>
        {L("Дор хаяж 10 ажилтны хариулт хэрэгтэй.", "At least 10 employee responses needed.", "최소 10개 응답 필요.")}
      </div>
    </div>
  );

  const retentionDiff = data.retention - data.industryRetention;
  const retentionColor = data.retention >= 80 ? "#3DDC97" : data.retention >= 65 ? "#FFD23F" : "#FF6B6B";

  return (
    <div style={{ padding: "16px 16px 48px", overflowY: "auto", height: "100%" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#B488FF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
          🔐 {L("Хувийн аналитик", "Private Analytics", "비공개 분석")}
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "var(--ink)" }}>
          {L("Ажлын байрны оновчтой ойлголт", "Workplace Insights", "직장 인사이트")}
        </div>
        <div style={{ fontSize: 13, color: "var(--dim)", marginTop: 4 }}>
          {companyName} · {data.responses} {L("нэрийгүй хариулт", "anonymous responses", "익명 응답")}
        </div>
      </div>

      {data.riskAlert && (
        <div style={{ ...glass, background: "rgba(255,168,0,0.08)", border: "1px solid rgba(255,168,0,0.3)", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#FFA800", marginBottom: 6 }}>
            ⚠️ {L("Анхааруулга: Ажилчдын эргэлт нэмэгдэж байна", "Alert: Turnover is Rising", "경고: 이직률 증가")}
          </div>
          <div style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.6 }}>
            {L("Сүүлийн ажилчдын эргэлт ердийнхөөс өндөр байна. Шалтгааныг доороос харна уу.", "Recent employee turnover is higher than usual. See breakdown below.", "최근 이직률이 평균보다 높습니다.")}
          </div>
        </div>
      )}

      {/* Retention comparison */}
      <div style={glass}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 14 }}>
          📊 {L("Хадгалалтын харьцуулалт", "Retention Comparison", "유지율 비교")}
        </div>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, textAlign: "center", padding: "14px 8px", background: "rgba(255,255,255,0.04)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 4 }}>{L("Салбарын дундаж", "Industry Avg", "업계 평균")}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "var(--dim)" }}>{data.industryRetention}%</div>
          </div>
          <div style={{ flex: 1, textAlign: "center", padding: "14px 8px", background: retentionColor === "#3DDC97" ? "rgba(61,220,151,0.1)" : retentionColor === "#FFD23F" ? "rgba(255,210,63,0.1)" : "rgba(255,107,107,0.1)", borderRadius: 14, border: `1px solid ${retentionColor}40` }}>
            <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 4 }}>{L("Таны компани", "Your Company", "귀사")}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: retentionColor }}>{data.retention}%</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: retentionDiff >= 0 ? "#3DDC97" : "#FF6B6B", fontWeight: 700, textAlign: "center" }}>
          {retentionDiff >= 0 ? "▲" : "▼"} {Math.abs(retentionDiff)}% {L("салбарын дундажтай харьцуулахад", "vs industry average", "vs 업계 평균")}
        </div>
      </div>

      {/* Trend */}
      <div style={glass}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
          📈 {L("7 сарын чиг хандлага", "7-Month Trend", "7개월 추세")}
        </div>
        <Sparkline data={data.trendMonths} color={retentionColor} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          {data.trendMonths.map((v, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "var(--dim)" }}>{["1","2","3","4","5","6","7"][i]}M</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: retentionColor }}>{v}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top reasons */}
      <div style={glass}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--dim)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
          🚪 {L("Явах гол шалтгаан", "Top Reasons for Leaving", "퇴사 이유")}
        </div>
        {data.reasons.map(r => {
          const label = lang === "mn" ? (EXIT_REASON_MN[r.label] || r.label) : r.label;
          const barColor = r.pct >= 30 ? "#FF6B6B" : r.pct >= 20 ? "#FFD23F" : "#4FA3FF";
          return (
            <div key={r.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: "var(--ink)" }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{r.pct}%</span>
              </div>
              <InsightBar pct={r.pct} color={barColor} />
            </div>
          );
        })}
      </div>

      {/* AI Suggestions (private) */}
      <div style={{ ...glass, background: "rgba(79,163,255,0.07)", border: "1px solid rgba(79,163,255,0.2)" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#4FA3FF", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
          🤖 {L("AI санал — Хадгалалт нэмэгдүүлэх", "AI Suggestions — Improve Retention", "AI 제안")}
        </div>
        {data.aiSuggestions.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10, padding: "10px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 12 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{"💡"}</span>
            <span style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Privacy */}
      <div style={{ textAlign: "center", fontSize: 11, color: "var(--dim)", lineHeight: 1.6, padding: "8px 0" }}>
        🔐 {L("Энэ аналитик зөвхөн танд харагдана. Ажилтны хувийн мэдээлэл агуулаагүй.", "This analytics is private to you only. No individual employee data included.", "이 분석은 귀사에만 표시됩니다.")}
      </div>
    </div>
  );
}

function EmployerTrustUpgradeSheet({ lang, onClose, onVerifyNow }) {
  const L = (mn, en, ko) => lang === "en" ? en : lang === "ko" ? ko : mn;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)" }} />
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, zIndex: 3001, background: "var(--bg-2)", borderRadius: "24px 24px 0 0", padding: "0 0 40px", animation: "rise 0.28s" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "12px auto 0" }} />
        <div style={{ padding: "20px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "var(--ink)", marginBottom: 4 }}>
                🔒 {L("Холбоо барих эрх хаалттай", "Contact Candidates", "후보자 연락")}
              </div>
              <div style={{ fontSize: 13, color: "var(--dim)", lineHeight: 1.5 }}>
                {L("Нэр дэвшигчдэд холбоо барихын тулд компанийн баталгаажуулалт шаардлагатай.", "Company verification is required to perform this action.", "이 작업에는 회사 인증이 필요합니다.")}
              </div>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.08)", color: "var(--dim)", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {Object.values(TRUST_LEVELS).map(tl => {
              const lbl = lang === "en" ? tl.label.en : lang === "ko" ? tl.label.ko : tl.label.mn;
              const canC = tl.canContact;
              return (
                <div key={tl.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 12, background: canC ? tl.color + "12" : "rgba(255,255,255,0.03)", border: `1px solid ${canC ? tl.color + "44" : "rgba(255,255,255,0.08)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{tl.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: canC ? tl.color : "var(--dim)" }}>{lbl}</span>
                  </div>
                  <span style={{ fontSize: 11, color: canC ? tl.color : "var(--dim)", fontWeight: 600 }}>
                    {canC ? (L("Холбогдох эрхтэй", "Can contact", "연락 가능")) : (L("Зөвхөн харах", "Browse only", "탐색만"))}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ background: "rgba(255,210,63,0.08)", border: "1px solid rgba(255,210,63,0.25)", borderRadius: 12, padding: "10px 14px", marginBottom: 18, fontSize: 12.5, color: "#FFD23F", lineHeight: 1.6 }}>
            ⚡ {L("Admin-ы баталгаажуулалтын дараа Баталгаажсан түвшинд шилжиж, нэр дэвшигчдэд холбоо барих боломжтой болно.", "After admin approval you will be upgraded to Verified and can contact candidates.", "관리자 승인 후 인증됨 수준으로 업그레이드되어 후보자에게 연락할 수 있습니다.")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {onVerifyNow && (
              <button onClick={onVerifyNow} style={{ width: "100%", padding: "13px 0", borderRadius: 14, border: "none", background: "linear-gradient(135deg,#FF6B35,#e8542a)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
                🛡 {L("Одоо баталгаажуулах →", "Verify Now →", "지금 인증하기 →")}
              </button>
            )}
            <button onClick={onClose} style={{ width: "100%", padding: "11px 0", borderRadius: 14, border: "none", background: "rgba(255,255,255,0.06)", color: "var(--dim)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              {L("Дараа нь", "Later", "나중에")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Splash Screen ───────────────────────────────── */

function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 550);   // wordmark up
    const t2 = setTimeout(() => setPhase(2), 850);   // tagline in
    const t3 = setTimeout(() => setPhase(3), 1100);  // dots in
    const t4 = setTimeout(() => setPhase(4), 1850);  // fade-out starts
    const t5 = setTimeout(() => onDone(),    2100);  // hand off
    return () => [t1,t2,t3,t4,t5].forEach(clearTimeout);
  }, []);

  const out = phase === 4;

  return (
    <>
      <style>{`
        @keyframes sh_logoIn {
          from { opacity:0; transform:scale(0.78); }
          to   { opacity:1; transform:scale(1); }
        }
        @keyframes sh_up {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes sh_fade {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes sh_dot {
          0%,80%,100% { transform:scale(0.55); opacity:0.3; }
          40%          { transform:scale(1);    opacity:1;   }
        }
        @keyframes sh_glow {
          0%,100% { transform:scale(1);    opacity:0.55; }
          50%     { transform:scale(1.12); opacity:0.8;  }
        }
        @keyframes sh_out {
          from { opacity:1; }
          to   { opacity:0; }
        }
        @keyframes sh_breathe {
          0%,100% { transform:translateY(0) scale(1); }
          50%     { transform:translateY(-3px) scale(1.015); }
        }
        @keyframes sh_bar {
          0%   { transform:translateX(-100%); }
          100% { transform:translateX(320%); }
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0,
        background: "var(--bg)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        zIndex: 9999,
        paddingTop: "env(safe-area-inset-top,0px)",
        paddingBottom: "env(safe-area-inset-bottom,0px)",
        animation: out ? "sh_out 250ms ease forwards" : "none",
        willChange: "opacity",
      }}>

        {/* ── Ambient glow ── */}
        <div style={{
          position: "absolute",
          width: 320, height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,106,0,0.18) 0%, rgba(255,106,0,0.05) 55%, transparent 72%)",
          animation: "sh_glow 3s ease-in-out infinite",
          pointerEvents: "none",
          willChange: "transform,opacity",
        }} />

        {/* ── Logo mark ── */}
        <div style={{
          position: "relative", marginBottom: 32,
          animation: "sh_logoIn 600ms cubic-bezier(0.22,1,0.36,1) forwards",
          willChange: "transform,opacity",
        }}>
          {/* Subtle icon glow ring */}
          <div style={{
            position: "absolute", inset: -18,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,106,0,0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          {/* Official SwipeHire icon — real PNG brand asset */}
          <img
            src="/splash-logo.png"
            width={96}
            height={96}
            alt="SwipeHire"
            style={{
              display: "block", position: "relative", borderRadius: 24, objectFit: "contain",
              boxShadow: "0 18px 44px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06), 0 8px 30px rgba(255,106,0,0.28)",
              animation: "sh_breathe 3.4s ease-in-out infinite",
            }}
          />
        </div>

        {/* ── Wordmark ── */}
        <div style={{
          animation: phase >= 1 ? "sh_up 380ms cubic-bezier(0.22,1,0.36,1) forwards" : "none",
          opacity: phase >= 1 ? undefined : 0,
          marginBottom: 8,
          willChange: "transform,opacity",
        }}>
          <div style={{
            fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
            fontWeight: 700,
            fontSize: 38,
            letterSpacing: -0.5,
            lineHeight: 1,
            color: "#FFFFFF",
            userSelect: "none",
          }}>
            Swipe<span style={{ color: "#FF6A00" }}>Hire</span>
          </div>
        </div>

        {/* ── Tagline ── */}
        <div style={{
          animation: phase >= 2 ? "sh_fade 400ms ease forwards" : "none",
          opacity: phase >= 2 ? undefined : 0,
          fontSize: 13,
          fontWeight: 500,
          color: "rgba(255,255,255,0.38)",
          letterSpacing: 0.5,
          userSelect: "none",
        }}>
          AI Matching. Better Hiring.
        </div>

        {/* ── Loading progress bar ── */}
        <div style={{
          position: "absolute",
          bottom: "max(56px, calc(56px + env(safe-area-inset-bottom,0px)))",
          width: 128, height: 3, borderRadius: 999,
          background: "rgba(255,255,255,0.08)", overflow: "hidden",
          animation: phase >= 3 ? "sh_fade 300ms ease forwards" : "none",
          opacity: phase >= 3 ? undefined : 0,
        }}>
          <div style={{
            width: "38%", height: "100%", borderRadius: 999,
            background: "linear-gradient(90deg,#FF8A3D,#E85400)",
            boxShadow: "0 0 12px rgba(255,106,0,0.7)",
            animation: phase >= 3 ? "sh_bar 1.15s cubic-bezier(0.5,0,0.2,1) infinite" : "none",
            willChange: "transform",
          }} />
        </div>

      </div>
    </>
  );
}

export default function App() {

  const [showSplash, setShowSplash] = useState(true);

  const [lang, setLang] = useState(() => localStorage.getItem("swipehire_lang") || "mn");

  // Theme: dark (brand default) or light. Applied globally via data-theme on the
  // document root so the background and all token-based surfaces flip.
  const [theme, setTheme] = useState(() => localStorage.getItem("swipehire_theme") || "dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("swipehire_theme", theme); } catch {}
  }, [theme]);
  const toggleTheme = () => setTheme((tm) => (tm === "dark" ? "light" : "dark"));

  const t = useCallback((k) => STRINGS[lang]?.[k] ?? STRINGS.en?.[k] ?? STRINGS.mn[k] ?? k, [lang]);

  const toggleLang = () => setLang(l => {

    const nl = l === "mn" ? "en" : l === "en" ? "ko" : "mn";

    localStorage.setItem("swipehire_lang", nl);

    return nl;

  });



  // ── localStorage persistence helpers ────────────────────────────────────────
  const LS = {
    get: (k, fallback) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del: (...keys) => keys.forEach(k => localStorage.removeItem(k)),
  };
  const LS_KEYS = ["swipehire_role","swipehire_emp","swipehire_saved","swipehire_stages","swipehire_notes","swipehire_seeker","swipehire_seeker_meta","swipehire_lang","swipehire_custom_skills"];

  const resetAllData = () => {
    LS.del(...LS_KEYS);
    window.location.reload();
  };

  // ── App-level state (localStorage-backed) ───────────────────────────────────
  const [role, setRole] = useState(() => LS.get("swipehire_role", null));

  // ── Real auth (dual-mode) ────────────────────────────────────────────────
  // When Supabase is configured we require a real session and derive the role
  // from profiles.role. When it is NOT configured (e.g. the public demo build)
  // this whole layer is inert and the existing demo flow runs unchanged.
  const AUTH_ENABLED = SUPABASE_CONFIGURED;
  const [authSession, setAuthSession] = useState(null);
  const [authReady, setAuthReady] = useState(!AUTH_ENABLED);
  const [companyId, setCompanyId] = useState(null); // resolved employer company (Phase 3b)
  const [showPostJob, setShowPostJob] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showApplicants, setShowApplicants] = useState(false);
  const [showMyJobs, setShowMyJobs] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  useEffect(() => {
    if (!AUTH_ENABLED) return;
    let unsub = () => {};
    getSession()
      .then((s) => { setAuthSession(s); })
      .catch(() => { setAuthSession(null); })
      .finally(() => setAuthReady(true));
    unsub = onAuthStateChange((s) => setAuthSession(s));
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve the app role from the authenticated profile (candidate → seeker).
  useEffect(() => {
    if (!AUTH_ENABLED) return;
    if (!authSession) { setRole(null); return; }
    getCurrentProfile()
      .then((p) => {
        const r = p?.role;
        if (r === "employer") setRole("employer");
        else if (r === "candidate") setRole("seeker");
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSession]);

  const doSignOut = useCallback(async () => {
    if (AUTH_ENABLED) { try { await authSignOut(); } catch { /* ignore */ } }
    setRole(null);
  }, [AUTH_ENABLED]);

  const _empRaw = LS.get("swipehire_emp", {});
  const [empSubmitted, setEmpSubmitted] = useState(() => !!_empRaw.submitted);
  const [empVerified, setEmpVerified] = useState(() => !!_empRaw.verified);
  const [empVerifData, setEmpVerifData] = useState(() => _empRaw.verifData || null);

  const [showTrustUpgrade, setShowTrustUpgrade] = useState(false);

  const [livePool, setLivePool] = useState([]); // шинэ бүртгэлтэй нэр дэвшигчид

  const [filter, setFilter] = useState([]); // [] = show all; array of category strings for multi-select

  const [saved, setSaved] = useState(() => new Set(LS.get("swipehire_saved", [])));

  const [contact, setContact] = useState(null);

  const [videoInvite, setVideoInvite] = useState(null);

  const [activeIdx, setActiveIdx] = useState(0);

  const [toast, setToast] = useState(null);

  const [tab, setTab] = useState("feed"); // feed | saved | dash | ai

  const [openId, setOpenId] = useState(null); // дэлгэрэнгүй профайл

  const [stages, setStages] = useState(() => LS.get("swipehire_stages", {
    1: "contacted", 2: "interview", 3: "saved", 4: "hired", 5: "rejected", 6: "saved", 7: "offer"
  }));

  const [notes, setNotes] = useState(() => LS.get("swipehire_notes", {}));

  const [empSwipes, setEmpSwipes] = useState(0);

  const [empSubscribed, setEmpSubscribed] = useState(false);

  const [showEmpPaywall, setShowEmpPaywall] = useState(false);

  // Step 3 (dev): sandbox employer-plan checkout preview. Grants only a
  // sandbox entitlement; does not touch empSubscribed / real access.
  const [checkoutPlanId, setCheckoutPlanId] = useState(null);
  const [sandboxEntitlement, setSandboxEntitlement] = useState(null);
  // Step 4 (dev scenario only): displayed annual plan, default FREE. NOT real
  // authorization — isolated from empSubscribed / Supabase / feature access.
  const [empDevPlan, setEmpDevPlan] = useState("free");

  const [showEmpLogout, setShowEmpLogout] = useState(false);
  const [showEmpResetConfirm, setShowEmpResetConfirm] = useState(false);
  const [showSeekerIntro, setShowSeekerIntro] = useState(false);


  // ── Persist App state to localStorage on change ──────────────────────────────
  useEffect(() => { LS.set("swipehire_role", role); }, [role]);
  useEffect(() => { LS.set("swipehire_emp", { submitted: empSubmitted, verified: empVerified, verifData: empVerifData }); }, [empSubmitted, empVerified, empVerifData]);

  // Phase 2c: sync employer profile to the DB when it changes (configured only).
  // updateEmployerProfile whitelists fields (logo/trustLevel are ignored).
  useEffect(() => {
    if (!AUTH_ENABLED || !empVerifData) return;
    const id = setTimeout(() => { updateEmployerProfile(empVerifData).catch(() => {}); }, 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empVerifData]);

  // Phase 2d: load employer profile from the DB when signed in as an employer.
  useEffect(() => {
    if (!AUTH_ENABLED || role !== "employer") return;
    getEmployerProfile().then((row) => {
      if (!row) return;
      setEmpVerifData((prev) => ({
        ...(prev || {}),
        name: row.company_name ?? prev?.name,
        regNum: row.reg_number ?? prev?.regNum,
        email: row.email ?? prev?.email,
        phone: row.phone ?? prev?.phone,
        hrName: row.hr_name ?? prev?.hrName,
        website: row.website ?? prev?.website,
        industry: row.industry ?? prev?.industry,
        headcount: row.headcount ?? prev?.headcount,
        salaryMin: row.salary_min ?? prev?.salaryMin,
        salaryMax: row.salary_max ?? prev?.salaryMax,
        selectedProfs: row.selected_professions?.length ? row.selected_professions : (prev?.selectedProfs || []),
      }));
      setEmpSubmitted(true);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Phase 3: employers see REAL published candidates from the DB. Loaded into
  // livePool (merged ahead of the mock fixtures). Inert in demo mode.
  useEffect(() => {
    if (!AUTH_ENABLED || role !== "employer") return;
    listPublishedCandidates({ limit: 100 }).then((rows) => {
      const mapped = (rows || []).map((row) => ({
        id: row.id,
        name: row.full_name || "—",
        age: null,
        location: row.location || "",
        category: row.category || "",
        years: Array.isArray(row.experience) ? row.experience.length : 0,
        salary: row.salary_expectation || 0,
        available: true,
        availableFrom: row.available_from || "",
        about: row.about || "",
        skills: [...(row.skills || []), ...(row.custom_skills || [])],
        experience: row.experience || [],
        education: row.education || [],
        photo: row.avatar_path ? getPublicUrl({ bucket: "avatars", path: row.avatar_path }) : undefined,
        live: true,
      }));
      if (mapped.length) setLivePool(mapped);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Phase 3b: ensure the employer has a company (needed to post jobs + billing).
  useEffect(() => {
    if (!AUTH_ENABLED || role !== "employer") return;
    getOrCreateCompany({
      name: empVerifData?.name,
      regNumber: empVerifData?.regNum,
      website: empVerifData?.website,
      industry: empVerifData?.industry,
      headcount: empVerifData?.headcount,
    }).then((c) => {
      if (c?.id) setCompanyId(c.id);
      // Verification is SERVER-controlled: trust companies.verified (admin-set),
      // never the client wizard flag, in production.
      setEmpVerified(!!c?.verified);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, empVerifData?.name]);

  // STEP 6: load persisted shortlist from saved_candidates on employer sign-in.
  useEffect(() => {
    if (!AUTH_ENABLED || role !== "employer") return;
    listSavedCandidates().then((ids) => {
      if (ids?.length) setSaved((prev) => new Set([...prev, ...ids]));
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);
  useEffect(() => { LS.set("swipehire_saved", [...saved]); }, [saved]);
  useEffect(() => { LS.set("swipehire_stages", stages); }, [stages]);
  useEffect(() => { LS.set("swipehire_notes", notes); }, [notes]);


  const feedRef = useRef(null);

  // Employer company logo upload → downscale to 240px data URL, store on empVerifData
  const empLogoInputRef = useRef(null);
  const onEmpLogoPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const chk = checkUpload(file, "image", lang);
    if (!chk.ok) { flash(chk.error); e.target.value = ""; return; }
    const img = new Image();
    img.onload = () => {
      const size = 240;
      const canvas = document.createElement("canvas");
      const scale = size / Math.min(img.width, img.height);
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(img.src);
      setEmpVerifData((p) => ({ ...(p || {}), logo: canvas.toDataURL("image/jpeg", 0.85) }));
      flash(lang === "en" ? "Logo updated ✓" : "Зураг шинэчлэгдлээ ✓");
    };
    img.src = URL.createObjectURL(file);
    e.target.value = "";
  };

  const feedTouchY = useRef(0);



  const onFeedTouchStart = (e) => {

    feedTouchY.current = e.touches[0].clientY;

  };



  const onFeedTouchEnd = (e) => {

    const el = feedRef.current;

    if (!el) return;

    const dy = feedTouchY.current - e.changedTouches[0].clientY;

    const h = el.clientHeight;

    if (Math.abs(dy) < 30) return; // жижиг хөдөлгөөнийг үл тооцно

    const cur = Math.round(el.scrollTop / h);

    const target = dy > 0 ? cur + 1 : cur - 1;

    el.scrollTo({ top: Math.max(0, target) * h, behavior: "smooth" });

  };



  const allCandidates = [...livePool, ...CANDIDATES];

  const list = allCandidates.filter((c) => filter.length === 0 || filter.includes(c.category));

  const savedList = allCandidates.filter((c) => saved.has(c.id));

  const openCand = allCandidates.find((c) => c.id === openId) || null;



  const setStage = useCallback((id, key) => {

    setStages((p) => ({ ...p, [id]: key }));

    if (key === "saved") setSaved((s) => new Set(s).add(id));

  }, []);



  const setNote = useCallback((id, text) => {

    setNotes((p) => ({ ...p, [id]: text }));

  }, []);



  const toggleSave = useCallback((id) => {

    setSaved((prev) => {

      const next = new Set(prev);

      if (next.has(id)) { next.delete(id); if (AUTH_ENABLED && typeof id === "string") unsaveCandidate(id).catch(() => {}); }

      else { next.add(id); if (AUTH_ENABLED && typeof id === "string") saveCandidate(id).catch(() => {}); }

      return next;

    });

    setStages((prev) => {

      const next = { ...prev };

      if (saved.has(id)) {

        // хасаж байгаа бол төлөвийг арилгана (хэрэв зөвхөн saved бол)

        if (next[id] === "saved") delete next[id];

      } else if (!next[id]) {

        next[id] = "saved";

      }

      return next;

    });

  }, [saved]);



  const flash = (msg) => {

    setToast(msg);

    setTimeout(() => setToast(null), 1800);

  };



  const onDownload = async (c) => {
    // 0) Real candidate → server-checked signed URL for their uploaded CV.
    //    Employer never has the storage path; the edge fn verifies the
    //    relationship. Falls through to a printable CV if none is uploaded.
    if (AUTH_ENABLED && typeof c.id === "string" && !c.cvFileData) {
      const url = await getCandidateDocumentUrl({ candidateId: c.id, kind: "cv" });
      if (url) { window.open(url, "_blank"); flash(lang === "en" ? "Opening CV…" : "CV нээж байна…"); return; }
    }
    // 1) Real uploaded PDF (local session) → download the actual file
    if (c.cvFileData) {
      const a = document.createElement("a");
      a.href = c.cvFileData;
      const base = (c.cvFile || `${c.name}-CV`).replace(/\.[^.]+$/, "");
      a.download = `${base}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      flash(lang === "en" ? "CV downloaded ✓" : `${c.name.split(" ")[0]}-ийн CV татагдлаа ✓`);
      return;
    }
    // 2) No uploaded file → build a printable CV (Save as PDF), Cyrillic-safe via browser fonts
    const esc = (s) => String(s ?? "").replace(/[&<>]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m]));
    const exp = (c.experience || []).map(e => `<li><b>${esc(e.role)}</b>${e.org ? " · " + esc(e.org) : ""}${e.period ? ` <span style="color:#888">(${esc(e.period)})</span>` : ""}</li>`).join("");
    const edu = (c.education || []).map(e => `<li><b>${esc(e.degree)}</b>${e.school ? " · " + esc(e.school) : ""}${e.period ? ` <span style="color:#888">(${esc(e.period)})</span>` : ""}</li>`).join("");
    const skills = (c.skills || []).map(s => `<span style="display:inline-block;background:#f1f1f1;border-radius:6px;padding:3px 9px;margin:2px;font-size:12px">${esc(s)}</span>`).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(c.name)} — CV</title>
<style>*{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a}body{max-width:720px;margin:32px auto;padding:0 28px}
h1{font-size:26px;margin:0}.sub{color:#FF6B35;font-weight:700;margin:4px 0 2px}.meta{color:#666;font-size:13px}
h2{font-size:14px;text-transform:uppercase;letter-spacing:.5px;color:#FF6B35;border-bottom:2px solid #eee;padding-bottom:4px;margin:22px 0 8px}
ul{margin:6px 0;padding-left:18px}li{margin:4px 0;font-size:14px}p{font-size:14px;line-height:1.6}
.hd{border-bottom:3px solid #FF6B35;padding-bottom:14px;margin-bottom:8px}</style></head><body>
<div class="hd"><h1>${esc(c.name)}</h1><div class="sub">${esc(c.category || "")}</div>
<div class="meta">${[c.age ? c.age + (lang === "en" ? " yrs" : " нас") : "", c.location, c.phone, c.email].filter(Boolean).map(esc).join(" · ")}</div></div>
${c.about ? `<h2>${lang === "en" ? "About" : "Танилцуулга"}</h2><p>${esc(c.about)}</p>` : ""}
${exp ? `<h2>${lang === "en" ? "Experience" : "Ажлын туршлага"}</h2><ul>${exp}</ul>` : ""}
${edu ? `<h2>${lang === "en" ? "Education" : "Боловсрол"}</h2><ul>${edu}</ul>` : ""}
${skills ? `<h2>${lang === "en" ? "Skills" : "Ур чадвар"}</h2><div>${skills}</div>` : ""}
${c.salary ? `<h2>${lang === "en" ? "Expected Salary" : "Хүсэж буй цалин"}</h2><p>₮${Number(c.salary).toLocaleString()}</p>` : ""}
<script>window.onload=()=>{setTimeout(()=>window.print(),350)}</script></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); flash(lang === "en" ? "Opening CV…" : "CV бэлдэж байна…"); }
    else flash(lang === "en" ? "Allow pop-ups to download CV" : "CV татахын тулд pop-up зөвшөөрнө үү");
  };



  // Gate: unverified / Basic employers can browse but cannot contact/invite

  const empCanContact = empVerified && (TRUST_LEVELS[empVerifData?.trustLevel]?.canContact !== false);

  const requireVerified = (action) => {

    if (empCanContact) return action;

    return () => setShowTrustUpgrade(true);

  };



  const markContacted = (id) => {

    setSaved((s) => new Set(s).add(id));

    setStages((p) => ({ ...p, [id]: p[id] === "interview" || p[id] === "offer" || p[id] === "hired" ? p[id] : "contacted" }));

    // Phase 3c: persist the relationship — save the candidate and open a
    // conversation with them (configured mode only; id is a candidate user id).
    if (AUTH_ENABLED && typeof id === "string") {
      saveCandidate(id).catch(() => {});
      createConversation({ otherUserId: id }).catch(() => {});
    }

  };



  const markInterviewInvited = (id) => {

    setSaved((s) => new Set(s).add(id));

    setStages((p) => ({ ...p, [id]: "interview" }));

    flash(`Ярилцлагын урилга илгээгдлээ!`);

  };



  const onScroll = () => {

    const el = feedRef.current;

    if (!el) return;

    const idx = Math.round(el.scrollTop / el.clientHeight);

    if (idx !== activeIdx) {

      setActiveIdx(idx);

      if (!empSubscribed) {

        const newCount = idx + 1;

        setEmpSwipes(newCount);

        if (newCount > FREE_SWIPES) setShowEmpPaywall(true);

      }

    }

  };



  useEffect(() => {

    if (feedRef.current) feedRef.current.scrollTop = 0;

    setActiveIdx(0);

  }, [filter]);



  const langCtxVal = { lang, t, toggleLang, theme, toggleTheme };

  const [dashStage, setDashStage] = useState(null); // dashboard stage drill-down

  // Android hardware back button — push a dummy history entry so popstate fires on back press
  useEffect(() => {
    window.history.pushState({ swipehire: true }, "");
    const handler = () => {
      // Close any open overlay/modal first
      if (showEmpLogout) { setShowEmpLogout(false); window.history.pushState({ swipehire: true }, ""); return; }
      if (showTrustUpgrade) { setShowTrustUpgrade(false); window.history.pushState({ swipehire: true }, ""); return; }
      if (showEmpPaywall) { setShowEmpPaywall(false); window.history.pushState({ swipehire: true }, ""); return; }
      if (videoInvite) { setVideoInvite(null); window.history.pushState({ swipehire: true }, ""); return; }
      if (contact) { setContact(null); window.history.pushState({ swipehire: true }, ""); return; }
      if (openId) { setOpenId(null); window.history.pushState({ swipehire: true }, ""); return; }
      if (dashStage) { setDashStage(null); window.history.pushState({ swipehire: true }, ""); return; }
      // Employer: go to feed tab if not already there
      if (role === "employer" && tab === "finance") { setTab("profile"); window.history.pushState({ swipehire: true }, ""); return; }
      if (role === "employer" && tab !== "feed") { setTab("feed"); window.history.pushState({ swipehire: true }, ""); return; }
      // If at top-level (role already null or feed) — let default back happen (minimize/exit app)
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEmpLogout, showTrustUpgrade, showEmpPaywall, videoInvite, contact, openId, role, tab, dashStage]);

  // onRegister: seeker профайл нийтлэгдэхэд livePool-д нэмнэ (hook — early return-ийн өмнө)

  const onRegister = useCallback((f) => {

    const id = Date.now();

    const newCand = {

      id,

      name: f.name || "Нэргүй",

      age: Number(f.age) || 25,

      gender: f.gender || "Эрэгтэй",

      category: f.category || "Гагнуурчин",

      location: f.location || "Улаанбаатар",

      years: f.experience?.length || 1,

      salary: Number(f.salary) || 1500000,

      available: true,

      availableFrom: f.availableFrom || "Шууд",

      phone: f.phone || "",

      pitch: f.about || "",

      about: f.about || "",

      skills: f.skills || [],

      experience: f.experience || [],

      education: f.education || [],

      certs: f.certs || [],

      verified: { phone: false, id: false, skill: false },

      transcript: f.about || "",

      ai: {

        resume: f.about || "Шинэ бүртгэлтэй нэр дэвшигч.",

        coreSkill: f.skills?.[0] || "—",

        level: "Дунд",

        bestFit: f.category || "—",

        strengths: f.skills?.slice(0, 3) || [],

      },

      cvFile: f.cvFile || "",

      cvFileData: f.cvFileData || "",

      isLive: true, // шинэ бүртгэл тэмдэглэгч

    };

    setLivePool((p) => [newCand, ...p]);

    flash(lang === "en" ? "Profile published! 🎉 Employers can now see you." : "Профайл нийтлэгдлээ! 🎉 Ажил олгогчид харж байна.");

  }, [lang]);



  // 0) Splash screen
  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;

  // 0a) Real-auth gate (only when Supabase is configured). While the session is
  // resolving, show a minimal loader; with no session, show the AuthGate.
  if (AUTH_ENABLED && !authReady) {
    return (
      <LangCtx.Provider value={langCtxVal}>
        <div className="app"><Style />
          <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", color: "var(--dim,#9a968d)" }}>…</div>
        </div>
      </LangCtx.Provider>
    );
  }
  if (AUTH_ENABLED && !authSession) {
    return (
      <LangCtx.Provider value={langCtxVal}>
        <div className="app"><Style />
          <AuthGate lang={lang} theme={theme} onToggleTheme={toggleTheme} />
        </div>
      </LangCtx.Provider>
    );
  }

  // 0b) Seeker intro screen (shown before role is committed)
  if (showSeekerIntro) {
    return (
      <LangCtx.Provider value={langCtxVal}>
        <SeekerIntroScreen
          onStart={() => { setShowSeekerIntro(false); setRole("seeker"); }}
          onDemo={() => { setShowSeekerIntro(false); setRole("employer"); }}
          onBack={() => setShowSeekerIntro(false)}
        />
      </LangCtx.Provider>
    );
  }

  // 1) Role сонгоогүй бол сонгох дэлгэц

  if (role === null) {

    return (

      <LangCtx.Provider value={langCtxVal}>

        <div className="app">

          <Style />

          <RoleSelect onSelect={(r) => { if (r === "seeker") setShowSeekerIntro(true); else setRole(r); }} />

        </div>

      </LangCtx.Provider>

    );

  }



  // 2) Ажил хайгч бол түүний dashboard

  if (role === "seeker") {

    return (

      <LangCtx.Provider value={langCtxVal}>

        <>

          <SeekerDashboard
            onSwitchRole={() => setRole("employer")}
            flash={flash}
            onRegister={onRegister}
            onGoHome={() => setRole(null)}
            onLogout={() => {
              localStorage.removeItem("swipehire_seeker");
              localStorage.removeItem("swipehire_seeker_meta");
              if (AUTH_ENABLED) doSignOut(); else setRole(null);
            }}
          />

          {/* Phase 3e: messages (seeker) */}
          {AUTH_ENABLED && (
            <button onClick={() => setShowChat(true)} aria-label="Messages"
              style={{ position: "fixed", right: 18, bottom: 84, zIndex: 60, width: 54, height: 54, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 24, cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,0.4)" }}>💬</button>
          )}
          {showChat && AUTH_ENABLED && (
            <ChatPanel lang={lang} myId={authSession?.user?.id} onClose={() => setShowChat(false)} />
          )}

          {toast && <div className="toast" role="status"><Check size={16} /> {toast}</div>}

        </>

      </LangCtx.Provider>

    );

  }



  // 2b) Employer must submit basic info first (can browse after; contact blocked until admin approves)

  if (role === "employer" && !empSubmitted) {

    return (

      <LangCtx.Provider value={langCtxVal}>

        <CompanyVerifyWizard

          lang={lang}

          initialData={empVerifData}

          onBack={() => setRole(null)}

          onSubmitted={(data) => { setEmpVerifData(data); setEmpSubmitted(true); }}

          onVerified={(data) => { setEmpVerifData(data); setEmpSubmitted(true); if (!AUTH_ENABLED) setEmpVerified(true); /* prod: server-controlled via companies.verified */ }}

        />

      </LangCtx.Provider>

    );

  }



  // 3) Ажил олгогч — Дэлгэрэнгүй профайл нээлттэй бол түүнийг харуул

  if (openCand) {

    return (

      <LangCtx.Provider value={langCtxVal}>

      <div className="app">

        <Style />

        <ProfileDetail

          c={openCand}

          saved={saved.has(openCand.id)}

          stage={stages[openCand.id] || "new"}

          note={notes[openCand.id]}

          onBack={() => setOpenId(null)}

          onToggleSave={toggleSave}

          onContact={requireVerified(setContact)}

          onDownload={onDownload}

          onSetStage={setStage}

          onSetNote={setNote}

          empVerifData={empVerifData}

        />

        <ContactSheet c={contact} onClose={() => setContact(null)} onContacted={markContacted}

          onVideoInvite={requireVerified((c) => { setContact(null); setVideoInvite(c); })} />

        {toast && <div className="toast" role="status"><Check size={16} /> {toast}</div>}

      </div>

      </LangCtx.Provider>

    );

  }



  return (

    <LangCtx.Provider value={langCtxVal}>

    <div className="app">

      <Style />



      {/* ── Premium top nav ── */}

      <header className="topbar--premium">

        {/* Left: Logo — always the first visual element */}
        <BrandLogo size={34} />



        {/* Center: Profession search pill — only in feed tab */}

        {tab === "feed" && (

          <ProfessionDropdown filter={filter} setFilter={setFilter} lang={lang} />

        )}



        {/* Right: actions */}

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>

          {AUTH_ENABLED && <NotificationBell lang={lang} />}

          <button onClick={toggleTheme} aria-label="Theme" style={{
            width: 34, height: 34, borderRadius: 8, border: "1px solid var(--hair-2)",
            background: "var(--surface)", cursor: "pointer", fontSize: 14,
          }}>{theme === "dark" ? "☀️" : "🌙"}</button>

          <button onClick={toggleLang} style={{

            height: 34, padding: "0 10px", borderRadius: 8,

            border: "1px solid var(--hair-2)",

            background: "var(--surface)", color: "var(--ink)",

            fontSize: 12, fontWeight: 700, cursor: "pointer", letterSpacing: ".3px",

          }}>{lang === "mn" ? "EN" : lang === "en" ? "KO" : "MN"}</button>

          {/* Profile / role menu */}

          {empSubmitted && !empVerified && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: "rgba(255,210,63,0.12)", color: "#FFD23F", border: "1px solid rgba(255,210,63,0.3)", whiteSpace: "nowrap", maxWidth: "min(160px, 38vw)", overflow: "hidden", textOverflow: "ellipsis" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FFD23F", display: "inline-block", animation: "pulse 1.5s infinite" }} />
              {lang === "en" ? "Pending review" : lang === "ko" ? "검토 중" : "Хянагдаж байна"}
            </div>
          )}
          <button onClick={() => setTab("profile")} title={empVerified ? (empVerifData?.name || "Verified") : undefined} style={{

            width: 34, height: 34, borderRadius: 10, border: "none", cursor: "pointer",

            background: empVerified ? "rgba(61,220,151,0.15)" : "rgba(255,255,255,0.09)",

            color: empVerified ? "#3DDC97" : "var(--ink)",

            display: "grid", placeItems: "center", position: "relative", overflow: "hidden",

          }}>

            {empVerifData?.logo
              ? <img src={empVerifData.logo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              : <User size={17} />}

            {empVerified && (

              <span style={{

                position: "absolute", bottom: -2, right: -2,

                width: 12, height: 12, borderRadius: "50%",

                background: empVerifData?.trustLevel ? TRUST_LEVELS[empVerifData.trustLevel]?.color || "#3DDC97" : "#3DDC97", border: "2px solid #1a1914",

                display: "grid", placeItems: "center", fontSize: 7, color: "#000", fontWeight: 900,

              }}>✓</span>

            )}

          </button>

        </div>

      </header>

      {/* Beta notice */}
      <div style={{ background: "rgba(255,107,53,0.10)", borderBottom: "1px solid rgba(255,107,53,0.18)", padding: "5px 16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 500, textAlign: "center" }}>
          {DEMO_MODE ? (lang === "en" ? "Demo mode — sample data, stored only on this device." : lang === "ko" ? "데모 모드 — 샘플 데이터, 이 기기에만 저장됩니다." : "Демо горим — жишээ өгөгдөл, зөвхөн энэ төхөөрөмжид хадгалагдана.") : (lang === "en" ? "Beta version." : lang === "ko" ? "베타 버전." : "Туршилтын хувилбар.")}
        </span>
      </div>

      {/* Employer paywall banner — табар дээр floating */}

      {tab === "feed" && !empSubscribed && empSwipes > 0 && (

        <div style={{

          position: "fixed", bottom: "calc(var(--tabh) + 10px)", left: 12, right: 12, zIndex: 50,

          display: "flex", alignItems: "center", justifyContent: "space-between",

          padding: "10px 14px",

          background: empSwipes >= FREE_SWIPES

            ? "rgba(20,10,10,0.95)"

            : "rgba(20,14,8,0.95)",

          border: `1.5px solid ${empSwipes >= FREE_SWIPES ? "rgba(255,68,68,0.5)" : "rgba(255,107,53,0.4)"}`,

          borderRadius: 14,

          backdropFilter: "blur(12px)",

          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",

        }}>

          <span style={{ fontSize: 13, color: empSwipes >= FREE_SWIPES ? "#ff6666" : "#FF6B35", fontWeight: 600 }}>

            {empSwipes >= FREE_SWIPES

              ? `⚠️  ${t("limitDone")}`

              : `⚡ ${FREE_SWIPES - empSwipes} ${t("freeLeft")} swipe`}

          </span>

          <button onClick={() => setShowEmpPaywall(true)} style={{

            padding: "6px 14px", borderRadius: 9, border: "none",

            background: "linear-gradient(135deg,#FF6B35,#e85a22)",

            color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer",

            boxShadow: "0 2px 10px rgba(255,107,53,0.4)",

          }}>{t("goPro")}</button>

        </div>

      )}



      {/* видео feed */}

      {tab === "feed" && (

        <main className="feed" ref={feedRef} onScroll={onScroll}

          onTouchStart={onFeedTouchStart} onTouchEnd={onFeedTouchEnd}>

          {list.length === 0 ? (

            <div className="empty">

              <p>{filter.length === 1 ? t(filter[0]) : t("Бүгд")} {t("noResults")}</p>

              <button onClick={() => setFilter([])}>{t("showAll")}</button>

            </div>

          ) : (

            list.map((c, i) => (

              <CandidateCard

                key={c.id}

                c={c}

                active={i === activeIdx}

                saved={saved.has(c.id)}

                onToggleSave={toggleSave}

                onContact={requireVerified(setContact)}

                onDownload={onDownload}

                onOpen={(c) => setOpenId(c.id)}

                empVerified={empVerified}

                empCanContact={empCanContact}

              />

            ))

          )}

          {list.length > 0 && activeIdx === 0 && (

            <div className="swipehint" aria-hidden>

              <ChevronUp size={18} /> {lang === "en" ? "Scroll up for next candidate" : lang === "ko" ? "위로 스크롤하세요" : "Дараагийнхыг үзэхдээ шудрана уу"}

            </div>

          )}

        </main>

      )}



      {/* хадгалсан */}

      {tab === "saved" && (

        <main className="panel">

          <Shortlist

            items={savedList}

            stages={stages}

            onRemove={toggleSave}

            onContact={requireVerified(setContact)}

            onVideoInvite={requireVerified((c) => setVideoInvite(c))}

            onDownload={onDownload}

            onBrowse={() => setTab("feed")}

            onOpen={(c) => setOpenId(c.id)}

          />

        </main>

      )}



      {/* хянах самбар */}

      {tab === "dash" && (

        <main className="panel">

          <Dashboard

            stages={stages}

            onOpen={(c) => setOpenId(c.id)}

            onBrowse={() => setTab("feed")}

            candidates={allCandidates}

            activeStagePage={dashStage}

            onStageOpen={(key) => { setDashStage(key); window.history.pushState({ swipehire: true }, ""); }}

            onStageClose={() => setDashStage(null)}

          />

        </main>

      )}



      {/* AI Recruiter */}

      {tab === "ai" && (

        <main className="panel" style={{ display: "flex", flexDirection: "column" }}>

          <AIRecruiterPanel candidates={allCandidates} />

        </main>

      )}



      {/* AI Workplace Insights tab */}

      {tab === "insights" && (

        <main className="panel" style={{ overflowY: "auto" }}>

          <EmployerInsightsDashboard companyName={empVerifData?.name || "Монголын Ган ХХК"} />

        </main>

      )}



      {/* Employer paywall modal */}

      {showEmpPaywall && (
        <div style={{ position: "fixed", inset: 0, zIndex: 240, display: "flex", flexDirection: "column" }}>
          {/* Legacy demo-gate notice: the 3-swipe limit is NOT the final quota */}
          <div style={{ background: "#2a2205", borderBottom: "1px solid rgba(255,210,63,0.4)", color: "#FFD23F", fontSize: 11.5, fontWeight: 700, padding: "10px 16px", lineHeight: 1.4, zIndex: 241 }}>
            ⚠️ {lang === "en"
              ? "Legacy demo gate: the current 3-swipe limit is temporary and is not the final annual-plan allowance system."
              : "Хуучин демо хязгаарлалт: одоогийн 3-swipe лимит нь түр зуурынх бөгөөд жилийн багцын эцсийн лимит систем биш."}
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            <EmployerPlanSheet
              lang={lang}
              currentPlanId={empDevPlan}
              onDevPlanChange={(planId) => setEmpDevPlan(planId)}  /* dev scenario only; does NOT set empSubscribed */
              onClose={() => setShowEmpPaywall(false)}
            />
          </div>
        </div>
      )}

      {/* Phase 3b: post a real job (only when the company is resolved) */}
      {AUTH_ENABLED && role === "employer" && companyId && (
        <button onClick={() => setShowPostJob(true)} aria-label="Post job"
          style={{ position: "fixed", right: 18, bottom: 88, zIndex: 60, width: 56, height: 56, borderRadius: "50%", border: "none", background: "linear-gradient(135deg,#FF6B35,#E85400)", color: "#fff", fontSize: 28, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 20px rgba(255,107,53,0.5)" }}>+</button>
      )}
      {showPostJob && (
        <PostJobSheet lang={lang} companyId={companyId}
          onClose={() => setShowPostJob(false)}
          onPosted={() => {}} />
      )}

      {/* Phase 2: request company verification (employer, when unverified) */}
      {AUTH_ENABLED && role === "employer" && !empVerified && (
        <button onClick={() => setShowVerify(true)} aria-label="Verify company"
          style={{ position: "fixed", right: 18, bottom: 344, zIndex: 60, width: 56, height: 56, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 22, cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,0.4)" }}>🛡️</button>
      )}
      {showVerify && AUTH_ENABLED && (
        <VerificationRequestSheet lang={lang} kind="company" onClose={() => setShowVerify(false)} />
      )}

      {/* Phase 1 STEP 5: my jobs (employer) */}
      {AUTH_ENABLED && role === "employer" && (
        <button onClick={() => setShowMyJobs(true)} aria-label="My jobs"
          style={{ position: "fixed", right: 18, bottom: 280, zIndex: 60, width: 56, height: 56, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 22, cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,0.4)" }}>📄</button>
      )}
      {showMyJobs && AUTH_ENABLED && (
        <MyJobsPanel lang={lang} onClose={() => setShowMyJobs(false)} />
      )}

      {/* Phase 3d: applicants (employer) */}
      {AUTH_ENABLED && role === "employer" && (
        <button onClick={() => setShowApplicants(true)} aria-label="Applicants"
          style={{ position: "fixed", right: 18, bottom: 216, zIndex: 60, width: 56, height: 56, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 22, cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,0.4)" }}>📋</button>
      )}
      {showApplicants && AUTH_ENABLED && (
        <ApplicantsPanel lang={lang}
          onMessage={(cid) => { if (cid) createConversation({ otherUserId: cid }).catch(() => {}); setShowApplicants(false); setShowChat(true); }}
          onClose={() => setShowApplicants(false)} />
      )}

      {/* Phase 3e: messages (employer) */}
      {AUTH_ENABLED && role === "employer" && (
        <button onClick={() => setShowChat(true)} aria-label="Messages"
          style={{ position: "fixed", right: 18, bottom: 152, zIndex: 60, width: 56, height: 56, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 24, cursor: "pointer", boxShadow: "0 6px 20px rgba(0,0,0,0.4)" }}>💬</button>
      )}
      {showChat && AUTH_ENABLED && (
        <ChatPanel lang={lang} myId={authSession?.user?.id} onClose={() => setShowChat(false)} />
      )}

      {/* Step 3: sandbox employer-plan checkout preview (dev-only) */}
      {checkoutPlanId && (
        <PaymentFlow
          kind="employer_plan"
          itemId={checkoutPlanId}
          lang={lang}
          onEntitlement={(ent) => setSandboxEntitlement(ent)}
          onClose={() => setCheckoutPlanId(null)}
        />
      )}



      {/* Санхүү (профайлаас нээгдэнэ) */}

      {tab === "finance" && (

        <main className="panel" style={{ overflowY: "auto" }}>

          <div style={{ padding: "14px 16px 0" }}>
            <button onClick={() => setTab("profile")} style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "8px 14px", color: "var(--ink)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <ChevronLeft size={16} /> {lang === "en" ? "Profile" : lang === "ko" ? "프로필" : "Профайл"}
            </button>

            {/* Step 3 dev entry: sandbox employer-plan checkout preview */}
            <div style={{ marginTop: 12, background: "rgba(255,210,63,0.06)", border: "1px dashed rgba(255,210,63,0.4)", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4, color: "#FFD23F", marginBottom: 8 }}>
                🧪 {lang === "en" ? "SANDBOX · DEVELOPMENT PREVIEW · NOT A REAL PAYMENT" : "САНДБОКС · ХӨГЖҮҮЛЭЛТИЙН УРЬДЧИЛСАН · БОДИТ ТӨЛБӨР БИШ"}
              </div>
              <button onClick={() => setCheckoutPlanId("professional")} style={{ background: "rgba(255,107,53,0.12)", border: "1px solid rgba(255,107,53,0.4)", borderRadius: 10, padding: "9px 14px", color: "#FF6B35", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                {lang === "en" ? "Preview plan checkout (Professional)" : "Багцын төлбөрийн урьдчилсан харагдац (Professional)"}
              </button>
              {sandboxEntitlement && (
                <div style={{ fontSize: 12, color: "#3DDC97", marginTop: 8 }}>
                  ✓ {lang === "en" ? "Sandbox entitlement" : "Сандбокс эрх"}: {sandboxEntitlement.itemId} · {sandboxEntitlement.status}
                </div>
              )}
            </div>
          </div>

          <FinancePanel

            subscribed={empSubscribed}

            onSubscribe={() => setShowEmpPaywall(true)}

            stages={stages}

            planId={empDevPlan}

          />

        </main>

      )}



      {/* Профайл tab */}

      {tab === "profile" && (

        <main className="panel" style={{ overflowY: "auto" }}>

          <EmployerProfilePanel
            data={empVerifData}
            verified={empVerified}
            subscribed={empSubscribed}
            lang={lang}
            logoInputRef={empLogoInputRef}
            onLogoPick={onEmpLogoPick}
            onEditInfo={() => setEmpSubmitted(false)}
            onOpenFinance={() => setTab("finance")}
            onOpenInsights={() => setTab("insights")}
            onUpgrade={() => setShowEmpPaywall(true)}
            onLogout={() => setShowEmpLogout(true)}
            onReset={() => setShowEmpResetConfirm(true)}
          />

        </main>

      )}



      {/* доод таб */}

      <nav className="tabbar" aria-label="Tabs" style={{ fontSize: 10 }}>

        <button className={`tabbar__btn ${tab === "feed" ? "is-on" : ""}`} onClick={() => setTab("feed")}>

          <Video size={20} /><span>{t("tabFeed")}</span>

        </button>

        <button className={`tabbar__btn ${tab === "saved" ? "is-on" : ""}`} onClick={() => setTab("saved")}>

          <span className="tabbar__icon"><Bookmark size={20} />{saved.size > 0 && <em>{saved.size}</em>}</span>

          <span>{t("tabSaved")}</span>

        </button>

        <button className={`tabbar__btn ${tab === "dash" ? "is-on" : ""}`} onClick={() => setTab("dash")}>

          <LayoutDashboard size={20} /><span>{t("tabDash")}</span>

        </button>

        <button className={`tabbar__btn ${tab === "ai" ? "is-on" : ""}`} onClick={() => setTab("ai")} style={{ position: "relative" }}>

          <span style={{ fontSize: 18 }}>🤖</span>

          <span>{lang === "en" ? "AI Recruit" : lang === "ko" ? "AI채용" : "AI Рекрутер"}</span>

          <span style={{ position: "absolute", top: 4, right: "calc(50% - 22px)", background: "linear-gradient(135deg,#FF6B35,#FFD23F)", color: "#fff", fontSize: 7, fontWeight: 900, borderRadius: 6, padding: "1px 4px" }}>PRO</span>

        </button>

        <button className={`tabbar__btn ${(tab === "profile" || tab === "finance") ? "is-on" : ""}`} onClick={() => setTab("profile")}>

          <User size={20} /><span>{lang === "en" ? "Profile" : lang === "ko" ? "프로필" : "Профайл"}</span>

        </button>

        <button className={`tabbar__btn ${tab === "insights" ? "is-on" : ""}`} onClick={() => setTab("insights")} style={{ position: "relative" }}>

          <span style={{ fontSize: 18 }}>📊</span>

          <span style={{ fontSize: 9 }}>{lang === "mn" ? "Ойлголт" : lang === "ko" ? "인사이트" : "Insights"}</span>

          <span style={{ position: "absolute", top: 4, right: "calc(50% - 20px)", background: "linear-gradient(135deg,#B488FF,#8B5CF6)", color: "#fff", fontSize: 7, fontWeight: 900, borderRadius: 6, padding: "1px 4px" }}>PRO</span>

        </button>

      </nav>



      <ContactSheet c={contact} onClose={() => setContact(null)} onContacted={markContacted}

        onVideoInvite={requireVerified((c) => { setContact(null); setVideoInvite(c); })} />

      {showTrustUpgrade && <EmployerTrustUpgradeSheet lang={lang} onClose={() => setShowTrustUpgrade(false)} onVerifyNow={() => { setShowTrustUpgrade(false); setEmpSubmitted(false); }} />}

      {showEmpLogout && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--bg-2)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 320, border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>
              {lang === "en" ? "Profile" : lang === "ko" ? "프로필" : "Профайл"}
            </div>

            {/* Company logo + upload */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
              <div style={{ position: "relative" }}>
                {empVerifData?.logo
                  ? <img src={empVerifData.logo} alt="" style={{ width: 84, height: 84, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,107,53,0.5)" }} />
                  : <div style={{ width: 84, height: 84, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.25)", display: "grid", placeItems: "center", fontSize: 30 }}>🏢</div>}
                <button onClick={() => empLogoInputRef.current?.click()} style={{ position: "absolute", bottom: -2, right: -2, width: 30, height: 30, borderRadius: "50%", border: "2px solid #1c1b16", background: "#FF6B35", color: "#fff", fontSize: 14, cursor: "pointer", display: "grid", placeItems: "center" }}>✎</button>
                <input ref={empLogoInputRef} type="file" accept="image/*" onChange={onEmpLogoPick} style={{ display: "none" }} />
              </div>
              {empVerifData?.name && <div style={{ fontWeight: 800, fontSize: 15, marginTop: 10 }}>{empVerifData.name}</div>}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: "var(--dim)" }}>{lang === "en" ? "User type" : lang === "ko" ? "사용자 유형" : "Хэрэглэгчийн төрөл"}</span>
              <span style={{ fontWeight: 600 }}>{lang === "en" ? "Employer" : lang === "ko" ? "고용주" : "Ажил олгогч"}</span>
            </div>
            {empVerifData?.email && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: "var(--dim)" }}>{lang === "en" ? "Email" : lang === "ko" ? "이메일" : "Имэйл"}</span>
                <span style={{ fontWeight: 600, maxWidth: "60%", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{empVerifData.email}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: "var(--dim)" }}>{lang === "en" ? "Verification" : lang === "ko" ? "인증" : "Баталгаажуулалт"}</span>
              <span style={{ color: empVerified ? "#3DDC97" : "#FFD23F", fontWeight: 600 }}>
                {empVerified ? (lang === "en" ? "Verified" : lang === "ko" ? "인증됨" : "Баталгаажсан") : (lang === "en" ? "Pending" : lang === "ko" ? "검토 중" : "Хянагдаж байна")}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 18 }}>
              <span style={{ color: "var(--dim)" }}>Version</span>
              <span style={{ color: "#FF6B35", fontWeight: 700, fontSize: 11 }}>Beta</span>
            </div>
            <div style={{ color: "var(--dim)", fontSize: 14, marginBottom: 18, lineHeight: 1.5 }}>
              {lang === "en" ? "Are you sure you want to logout?" : lang === "ko" ? "로그아웃하시겠습니까?" : "Та гарахдаа итгэлтэй байна уу?"}
            </div>
            <button onClick={() => { setShowEmpLogout(false); setEmpSubmitted(false); }} style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,107,53,0.4)", background: "rgba(255,107,53,0.1)", color: "#FF6B35", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 10 }}>
              ✏️ {lang === "en" ? "Edit Company Info" : lang === "ko" ? "회사 정보 수정" : "Мэдээлэл засах"}
            </button>
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <button onClick={() => setShowEmpLogout(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "var(--ink)", fontWeight: 600, cursor: "pointer" }}>
                {lang === "en" ? "Cancel" : lang === "ko" ? "취소" : "Болих"}
              </button>
              <button onClick={() => { setShowEmpLogout(false); setRole(null); }} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#FF5050", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {lang === "en" ? "Logout" : lang === "ko" ? "로그아웃" : "Гарах"}
              </button>
            </div>
            <button onClick={() => { setShowEmpLogout(false); setShowEmpResetConfirm(true); }} style={{ width: "100%", padding: "8px 0", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "var(--dim)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
              {lang === "en" ? "Reset Demo Data" : lang === "ko" ? "데모 데이터 초기화" : "Демо өгөгдөл устгах"}
            </button>
          </div>
        </div>
      )}



      {showEmpResetConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--bg-2)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 320, border: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
              {lang === "en" ? "Reset all demo data?" : lang === "ko" ? "데모 데이터 초기화?" : "Демо өгөгдлийг устгах уу?"}
            </div>
            <div style={{ color: "var(--dim)", fontSize: 14, marginBottom: 22, lineHeight: 1.5 }}>
              {lang === "en" ? "This cannot be undone." : lang === "ko" ? "이 작업은 되돌릴 수 없습니다." : "Буцаах боломжгүй."}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowEmpResetConfirm(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "var(--ink)", fontWeight: 600, cursor: "pointer" }}>
                {lang === "en" ? "Cancel" : lang === "ko" ? "취소" : "Болих"}
              </button>
              <button onClick={() => { setShowEmpResetConfirm(false); localStorage.clear(); window.location.reload(); }} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#FF5050", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                {lang === "en" ? "Reset" : lang === "ko" ? "초기화" : "Устгах"}
              </button>
            </div>
          </div>
        </div>
      )}

      <VideoCallInviteSheet c={videoInvite} onClose={() => setVideoInvite(null)}

        onInvited={markInterviewInvited} />



      {toast && <div className="toast" role="status"><Check size={16} /> {toast}</div>}

    </div>

    </LangCtx.Provider>

  );

}



/* ── Загвар ─────────────────────────────────────── */

function Style() {

  return (

    <style>{`

      @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;500;600&display=swap');



      *{box-sizing:border-box;margin:0;padding:0}

      /* ── Light theme overrides (higher specificity → win regardless of order) ── */
      [data-theme="light"] body{ background:#ece9e3; }
      [data-theme="light"] .app{
        /* warm light-gray base (not pure white) so existing inline
           rgba(255,255,255,…) surfaces & borders still read as raised areas */
        --bg:#e8e5df; --bg-2:#f4f2ec; --ink:#1a1712; --ink-2:#3d3830; --dim:#6f6a61;
        --surface:rgba(255,255,255,.65); --surface-2:rgba(255,255,255,.9);
        --surface-hi:linear-gradient(160deg,rgba(255,255,255,.9),rgba(255,255,255,.6));
        --hair:rgba(0,0,0,.10); --hair-2:rgba(0,0,0,.16);
        --sh-1:0 2px 8px rgba(0,0,0,.10);
        --sh-2:0 8px 24px rgba(0,0,0,.12), inset 0 1px 0 rgba(255,255,255,.6);
        --sh-3:0 16px 44px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.7);
      }

      .app{

        /* ── SwipeHire premium design tokens (dark · black + orange) ── */
        --bg:#0f0e0c; --bg-2:#141310; --ink:#f6f4ef; --ink-2:#d6d2c9; --dim:#9a968d; --tabh:64px;
        --sat: env(safe-area-inset-top, 0px);

        /* brand accent scale */
        --accent:#FF6B35; --accent-2:#FF8A3D; --accent-deep:#E85400; --accent-soft:rgba(255,107,53,.13);
        --success:#3DDC97; --info:#4FA3FF; --warn:#FFC24B; --danger:#FF6B6B;

        /* surfaces — soft, layered, glass-ready */
        --surface:rgba(255,255,255,.045); --surface-2:rgba(255,255,255,.07);
        --surface-hi:linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,.03));
        --hair:rgba(255,255,255,.09); --hair-2:rgba(255,255,255,.14);

        /* radii — large, friendly (16–28px) */
        --r-xs:10px; --r-sm:14px; --r-md:18px; --r-lg:22px; --r-xl:28px; --r-pill:999px;

        /* soft, layered elevation */
        --sh-1:0 2px 8px rgba(0,0,0,.28);
        --sh-2:0 8px 24px rgba(0,0,0,.40), inset 0 1px 0 rgba(255,255,255,.06);
        --sh-3:0 16px 44px rgba(0,0,0,.52), inset 0 1px 0 rgba(255,255,255,.10);
        --sh-accent:0 8px 24px rgba(255,107,53,.34);

        /* motion */
        --ease:cubic-bezier(.22,1,.36,1); --ease-out:cubic-bezier(.16,1,.3,1);
        --dur-1:150ms; --dur-2:240ms; --dur-3:380ms;

        position:relative; width:100%; max-width:440px; height:100dvh;

        margin:0 auto; background:var(--bg); color:var(--ink);

        font-family:'Inter',system-ui,sans-serif; overflow:hidden;

        display:flex; flex-direction:column;
        -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;

      }

      /* ── Global premium polish ─────────────────────────────────── */
      .app *{ -webkit-tap-highlight-color:transparent }
      .app button, .app [role="button"]{ transition:transform var(--dur-1) var(--ease), box-shadow var(--dur-2) var(--ease), background var(--dur-2) var(--ease), opacity var(--dur-1) var(--ease) }
      .app button:active, .app [role="button"]:active{ transform:scale(.97) }
      .app :focus-visible{ outline:2px solid var(--accent); outline-offset:2px; border-radius:8px }

      @keyframes sh_rise{ from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:none} }
      @keyframes sh_pop{ 0%{transform:scale(.94); opacity:0} 100%{transform:scale(1); opacity:1} }
      @keyframes sh_shimmer{ 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      .sh-rise{ animation:sh_rise var(--dur-3) var(--ease-out) both }

      /* premium button primitive */
      .btn{ display:inline-flex; align-items:center; justify-content:center; gap:8px;
        border:none; cursor:pointer; font-weight:800; font-size:15px; letter-spacing:-.1px;
        padding:14px 20px; border-radius:var(--r-md); color:#fff;
        background:linear-gradient(135deg,var(--accent-2),var(--accent-deep));
        box-shadow:var(--sh-accent) }
      .btn:hover{ transform:translateY(-1px); box-shadow:0 12px 30px rgba(255,107,53,.42) }
      .btn--ghost{ background:transparent; color:var(--ink); border:1px solid var(--hair-2); box-shadow:none }
      .btn--ghost:hover{ background:var(--surface); transform:translateY(-1px); box-shadow:none }
      .btn--soft{ background:var(--accent-soft); color:var(--accent-2); box-shadow:none }
      .ai-ex{ transition:transform var(--dur-2) var(--ease), border-color var(--dur-2) var(--ease), box-shadow var(--dur-2) var(--ease) }
      .ai-ex:hover{ transform:translateY(-2px); border-color:rgba(255,107,53,.3); box-shadow:0 10px 26px rgba(0,0,0,.4) }

      /* premium card primitive */
      .card{ background:var(--surface-hi); border:1px solid var(--hair);
        border-radius:var(--r-lg); box-shadow:var(--sh-2);
        backdrop-filter:blur(16px) saturate(140%); -webkit-backdrop-filter:blur(16px) saturate(140%) }

      /* skeleton loading */
      .skeleton{ background:linear-gradient(90deg,rgba(255,255,255,.05) 25%,rgba(255,255,255,.11) 37%,rgba(255,255,255,.05) 63%);
        background-size:200% 100%; animation:sh_shimmer 1.4s ease-in-out infinite; border-radius:var(--r-sm) }

      @media (prefers-reduced-motion: reduce){
        .app *,.app button{ animation:none !important; transition:none !important }
      }



      /* ── Top navigation ── */

      .topbar--premium{

        position:relative; z-index:30; flex:0 0 auto;

        display:flex; align-items:center; gap:10px;

        padding:10px 14px 10px;

        padding-top:max(10px, var(--sat));

        background:linear-gradient(180deg,rgba(22,21,15,.82),rgba(20,19,16,.94));
        backdrop-filter:blur(20px) saturate(140%); -webkit-backdrop-filter:blur(20px) saturate(140%);

        border-bottom:1px solid var(--hair);

        box-shadow:0 4px 20px rgba(0,0,0,.28);

      }

      .brand{font-family:'Barlow Condensed',sans-serif; font-weight:700;

        font-size:22px; letter-spacing:.5px; display:flex; align-items:center; gap:5px;

        text-transform:uppercase; flex-shrink:0}

      .brand__hire{color:#FF6B35}

      /* ── BrandLogo — single reusable brand lockup ── */
      .brandlogo{display:inline-flex; align-items:center; user-select:none; flex-shrink:0;
        transition:transform 220ms ease; transform-origin:left center; will-change:transform}
      .brandlogo:hover{transform:scale(1.02)}
      .brandlogo--tap{cursor:pointer}
      .brandlogo--tap:active{transform:scale(0.99)}
      .brandlogo__mark{display:block; flex-shrink:0; object-fit:contain}
      .brandlogo__word{font-family:'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        font-weight:700; line-height:1; letter-spacing:-0.3px; color:#fff; white-space:nowrap}
      .brandlogo__word b{color:#FF6A00; font-weight:700}

      /* ── Glass profile (black + orange) ─────────────── */
      .gp{padding:18px 16px calc(28px + var(--tabh)); position:relative; overflow:hidden}
      .gp::before{content:""; position:absolute; top:-120px; right:-90px; width:280px; height:280px; border-radius:50%;
        background:radial-gradient(circle, rgba(255,107,53,.28) 0%, rgba(255,107,53,.06) 55%, transparent 72%); pointer-events:none}
      .gp::after{content:""; position:absolute; bottom:80px; left:-110px; width:240px; height:240px; border-radius:50%;
        background:radial-gradient(circle, rgba(255,166,0,.14) 0%, transparent 70%); pointer-events:none}
      .gp>*{position:relative; z-index:1}

      .gcard{background:linear-gradient(160deg, rgba(255,255,255,.075), rgba(255,255,255,.03));
        border:1px solid rgba(255,255,255,.10); border-radius:24px;
        backdrop-filter:blur(18px) saturate(140%); -webkit-backdrop-filter:blur(18px) saturate(140%);
        box-shadow:0 10px 30px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.13)}

      .gp__hero{padding:24px 20px 20px; text-align:center; margin-bottom:16px}
      .gp__ava{width:104px; height:104px; border-radius:34px; margin:0 auto 14px; position:relative;
        display:grid; place-items:center; overflow:hidden;
        background:linear-gradient(150deg,#2a2018,#171512);
        border:1px solid rgba(255,255,255,.14);
        box-shadow:0 14px 34px rgba(0,0,0,.55), 0 0 0 6px rgba(255,107,53,.10), inset 0 1px 0 rgba(255,255,255,.18)}
      .gp__ava img{width:100%; height:100%; object-fit:cover}
      .gp__edit{position:absolute; right:-4px; bottom:-4px; width:34px; height:34px; border-radius:50%;
        border:3px solid #12110f; background:linear-gradient(135deg,#FF8A3D,#E85400); color:#fff;
        display:grid; place-items:center; cursor:pointer; font-size:14px; box-shadow:0 5px 14px rgba(255,107,53,.5)}
      .gp__name{font-size:21px; font-weight:900; letter-spacing:-.3px; color:#fff}
      .gp__badge{display:inline-flex; align-items:center; gap:5px; margin-top:8px; padding:5px 13px; border-radius:999px;
        font-size:11.5px; font-weight:800; letter-spacing:.2px}

      .gp__lbl{font-size:11px; font-weight:800; letter-spacing:1.1px; color:rgba(255,255,255,.42);
        text-transform:uppercase; margin:22px 4px 10px}

      .grow{display:flex; align-items:center; gap:13px; padding:13px 16px}
      .grow+.grow{border-top:1px solid rgba(255,255,255,.06)}
      .grow__ic{width:38px; height:38px; border-radius:13px; flex-shrink:0; display:grid; place-items:center;
        background:linear-gradient(140deg, rgba(255,107,53,.22), rgba(255,107,53,.07));
        border:1px solid rgba(255,107,53,.26); color:#FF8A3D;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.14)}
      .grow__k{font-size:11px; color:rgba(255,255,255,.45); font-weight:600}
      .grow__v{font-size:14px; color:#fff; font-weight:700; margin-top:1px; word-break:break-word}

      .ggrid{display:grid; grid-template-columns:repeat(3,1fr); gap:12px}
      .gtile{border-radius:22px; padding:16px 8px 13px; display:flex; flex-direction:column; align-items:center; gap:9px;
        cursor:pointer; border:1px solid rgba(255,255,255,.10);
        background:linear-gradient(160deg, rgba(255,255,255,.075), rgba(255,255,255,.028));
        backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
        box-shadow:0 8px 22px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.12);
        transition:transform 200ms ease, box-shadow 200ms ease}
      .gtile:active{transform:scale(.96)}
      .gtile:hover{transform:translateY(-2px); box-shadow:0 14px 30px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.16)}
      .gtile__ic{width:52px; height:52px; border-radius:18px; display:grid; place-items:center; font-size:23px;
        box-shadow:0 7px 18px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.28)}
      .gtile__t{font-size:11.5px; font-weight:800; color:#fff; text-align:center; line-height:1.25}
      .gtile__s{font-size:9.5px; color:rgba(255,255,255,.4); text-align:center; margin-top:-4px}

      /* keep solid variant for other screens */

      .topbar{

        position:absolute; top:0; left:0; right:0; z-index:30;

        display:flex; align-items:center; justify-content:space-between;

        padding:12px 16px;

        padding-top:max(12px, var(--sat));

        background:linear-gradient(180deg,rgba(0,0,0,.55),transparent);

      }

      .topbar__search{background:rgba(255,255,255,.12); border:none; color:var(--ink);

        width:36px;height:36px;border-radius:50%; display:grid;place-items:center;

        cursor:pointer; backdrop-filter:blur(6px)}

      .topbar__actions{display:flex; align-items:center; gap:8px}

      .topbar__role{background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.18);

        color:var(--ink); font-size:12px; font-weight:600; padding:7px 12px; border-radius:999px;

        cursor:pointer; backdrop-filter:blur(6px); white-space:nowrap}

      .topbar--solid{position:relative; background:#16150f; border-bottom:1px solid rgba(255,255,255,.08);

        padding:12px 16px; padding-top:max(12px, var(--sat))}



      /* ── Role сонгох дэлгэц ── */

      .role{position:absolute; inset:0; display:flex; flex-direction:column; align-items:center;

        justify-content:center; padding:28px 22px; text-align:center; overflow-y:auto;

        background:radial-gradient(120% 80% at 50% 0%, rgba(255,107,53,.14), transparent 60%), var(--bg)}

      .role__brand{display:flex; align-items:center; margin-bottom:32px}

      .role__title{font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:36px; line-height:1; margin-bottom:10px; letter-spacing:-.5px}

      .role__sub{font-size:14px; color:var(--dim); line-height:1.55; margin-bottom:30px}

      .rolecard{width:100%; max-width:360px; display:flex; align-items:center; gap:15px;
        background:var(--surface-hi); border:1px solid var(--hair); border-radius:var(--r-lg);
        box-shadow:var(--sh-2); backdrop-filter:blur(16px) saturate(140%); -webkit-backdrop-filter:blur(16px) saturate(140%);
        padding:19px 17px; margin-bottom:14px; cursor:pointer; text-align:left;
        transition:transform var(--dur-2) var(--ease), box-shadow var(--dur-2) var(--ease), border-color var(--dur-2) var(--ease)}

      .rolecard:active{transform:scale(.98)}

      .rolecard:hover{transform:translateY(-3px); border-color:var(--hair-2);
        box-shadow:0 18px 40px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.12)}

      .rolecard:hover .rolecard__arrow{transform:translateX(4px); color:var(--accent-2)}

      .rolecard__icon{flex:0 0 auto; width:56px; height:56px; border-radius:var(--r-md); display:grid; place-items:center;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.16), 0 6px 16px rgba(0,0,0,.32)}

      .rolecard__body{flex:1; min-width:0; display:flex; flex-direction:column; gap:3px}

      .rolecard__body b{font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:21px; color:var(--ink)}

      .rolecard__body small{font-size:12.5px; color:var(--dim); line-height:1.4}

      .rolecard__arrow{color:var(--dim); flex:0 0 auto; transition:transform var(--dur-2) var(--ease), color var(--dur-2) var(--ease)}

      .role__foot{margin-top:22px; font-size:12px; color:#3DDC97; font-weight:600}



      /* ── Ажил хайгчийн dashboard ── */

      .panel--seeker{padding-top:16px}

      .seeker{padding:8px 16px 28px}

      .seeker__hero{display:flex; align-items:center; gap:14px; margin-bottom:20px}

      .seeker__hero h1{font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:24px; line-height:1}

      .seeker__hero span{font-size:12.5px; color:var(--dim)}

      .seeker__progress{background:var(--surface-hi); border:1px solid var(--hair); border-radius:var(--r-lg);
        box-shadow:var(--sh-2); backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);

        padding:16px 16px; margin-bottom:18px}

      .seeker__ptop{display:flex; align-items:center; justify-content:space-between; font-size:13px; font-weight:600; margin-bottom:10px}

      .seeker__ptop b{font-family:'Barlow Condensed',sans-serif; font-size:19px}

      .seeker__pbar{height:9px; background:rgba(255,255,255,.08); border-radius:999px; overflow:hidden}

      .seeker__pbar span{display:block; height:100%; background:linear-gradient(90deg,#FF8A3D,#E85400); border-radius:999px;
        box-shadow:0 0 10px rgba(255,107,53,.55); transition:width var(--dur-3) var(--ease)}

      .seeker__progress small{display:block; margin-top:7px; font-size:11px; color:var(--dim)}

      .seeker__steps{display:flex; flex-direction:column; gap:10px; margin-bottom:16px}

      .sstep{display:flex; align-items:center; gap:13px; background:var(--surface); border:1px solid var(--hair);

        border-radius:var(--r-md); padding:14px; cursor:pointer; text-align:left;
        box-shadow:var(--sh-1);
        transition:transform var(--dur-2) var(--ease), box-shadow var(--dur-2) var(--ease), border-color var(--dur-2) var(--ease)}

      .sstep:active{transform:scale(.98)}
      .sstep:hover{transform:translateY(-2px); box-shadow:var(--sh-2); border-color:var(--hair-2)}

      .sstep.is-done{background:rgba(61,220,151,.07); border-color:rgba(61,220,151,.25)}

      .sstep__icon{flex:0 0 auto; width:46px; height:46px; border-radius:var(--r-sm); display:grid; place-items:center;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.14)}

      .sstep__body{flex:1; min-width:0; display:flex; flex-direction:column; gap:2px}

      .sstep__body b{font-size:15px; font-weight:600}

      .sstep__body small{font-size:12px; color:var(--dim); line-height:1.35}

      .sstep__check{flex:0 0 auto; width:24px; height:24px; border-radius:50%;

        border:2px solid rgba(255,255,255,.2); display:grid; place-items:center; color:#11110f}

      .seeker__live{display:flex; align-items:center; gap:9px; background:rgba(61,220,151,.12);

        border:1px solid rgba(61,220,151,.35); color:#3DDC97; border-radius:14px; padding:14px;

        font-size:13.5px; font-weight:600; line-height:1.4}

      .seeker__live svg{flex:0 0 auto}

      .seeker__hint{font-size:12.5px; color:var(--dim); line-height:1.5; padding:0 2px}

      .seeker__edit{width:100%; margin-top:16px; background:var(--surface);

        border:1px solid var(--hair-2); color:var(--ink); font-weight:700; font-size:14px;

        padding:14px; border-radius:var(--r-md); cursor:pointer;
        transition:background var(--dur-2) var(--ease), transform var(--dur-1) var(--ease)}
      .seeker__edit:hover{background:var(--surface-2); transform:translateY(-1px)}



      /* нийтлэгдсэн профайлын товч харагдац */

      .spv{display:grid; grid-template-columns:1fr 1fr; gap:9px; margin:18px 0}

      .spv__row{background:#1b1a15; border:1px solid rgba(255,255,255,.06); border-radius:13px;

        padding:11px 10px; display:flex; flex-direction:column; align-items:center; gap:3px; text-align:center}

      .spv__row svg{color:var(--dim)}

      .spv__row b{font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:14px}

      .spv__row small{font-size:10px; color:var(--dim)}

      .spv__about{margin-bottom:14px}

      .spv__about b, .spv__skills b{display:block; font-family:'Barlow Condensed',sans-serif;

        font-weight:700; font-size:16px; margin-bottom:7px}

      .spv__about p{font-size:13px; line-height:1.5; color:#d8d5cd}

      .spv__skills{margin-bottom:6px}



      /* ── Onboarding wizard ── */

      .wiz__back{background:rgba(255,255,255,.08); border:none; color:var(--ink);

        width:36px;height:36px;border-radius:50%; display:grid;place-items:center; cursor:pointer; flex:0 0 auto}

      .wiz__htitle{flex:1; text-align:center; font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:18px}

      .wiz__count{font-size:13px; font-weight:600; color:var(--dim); flex:0 0 auto; min-width:34px; text-align:right}

      .wiz__bar{flex:0 0 auto; height:4px; background:rgba(255,255,255,.08); position:relative; z-index:5}

      .wiz__bar span{display:block; height:100%; border-radius:0 999px 999px 0;
        background:linear-gradient(90deg,#FF8A3D,#E85400); box-shadow:0 0 12px rgba(255,107,53,.6);
        transition:width var(--dur-3) var(--ease)}

      .panel--wiz{padding-top:0}

      .wiz{padding:18px 16px 24px}

      .wiz__fields{display:flex; flex-direction:column; gap:15px}

      .wiz__two{display:grid; grid-template-columns:1fr 1fr; gap:11px}

      .wiz__hint{font-size:12px; color:var(--dim); line-height:1.5}



      .field{display:flex; flex-direction:column; gap:6px}

      .field__label{display:inline-flex; align-items:center; gap:5px; font-size:12.5px; font-weight:600; color:#cbc8c0}

      .field__label svg{color:var(--dim)}

      .field input, .field textarea{width:100%; background:var(--surface); border:1px solid var(--hair);

        border-radius:var(--r-sm); color:var(--ink); font-family:inherit; font-size:15px; padding:13px 14px; resize:vertical;
        transition:border-color var(--dur-2) var(--ease), box-shadow var(--dur-2) var(--ease), background var(--dur-2) var(--ease)}

      .field input:focus, .field textarea:focus{outline:none; border-color:var(--accent); background:var(--surface-2);
        box-shadow:0 0 0 3px rgba(255,107,53,.16)}

      .field input::placeholder, .field textarea::placeholder{color:#6b685f}



      .pills{display:flex; gap:7px}

      .pills--wrap{flex-wrap:wrap}

      .pill{padding:9px 14px; border-radius:var(--r-pill); background:var(--surface);
        border:1px solid var(--hair); color:var(--ink-2); font-size:13px; font-weight:600;
        cursor:pointer; white-space:nowrap;
        transition:background var(--dur-2) var(--ease), border-color var(--dur-2) var(--ease), color var(--dur-2) var(--ease)}

      .pill.is-on{background:linear-gradient(135deg,var(--accent-2),var(--accent-deep));
        border-color:transparent; color:#fff; font-weight:700; box-shadow:var(--sh-accent)}



      .rowcard{position:relative; background:#1b1a15; border:1px solid rgba(255,255,255,.07);

        border-radius:15px; padding:14px; display:flex; flex-direction:column; gap:12px}

      .rowcard__del{position:absolute; top:10px; right:10px; background:rgba(255,107,53,.14);

        border:none; color:#ff7a7a; width:30px;height:30px;border-radius:8px; display:grid;place-items:center; cursor:pointer}

      .wiz__add{display:inline-flex; align-items:center; justify-content:center; gap:7px;

        background:rgba(255,107,53,.12); border:1px dashed rgba(255,107,53,.4); color:#FF6B35;

        font-weight:600; font-size:13.5px; padding:13px; border-radius:13px; cursor:pointer}



      .skillpick{display:flex; flex-wrap:wrap; gap:8px}

      .skilltag{display:inline-flex; align-items:center; gap:4px; padding:8px 12px; border-radius:999px;

        background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.14); color:var(--ink);

        font-size:12.5px; font-weight:500; cursor:pointer}

      .skilltag.is-on{background:rgba(61,220,151,.16); border-color:#3DDC97; color:#3DDC97; font-weight:600}



      .vidopt{display:flex; align-items:center; gap:13px; background:#1b1a15; border:1px solid rgba(255,255,255,.08);

        border-radius:15px; padding:15px; cursor:pointer; text-align:left}

      .vidopt.is-on{border-color:rgba(255,107,53,.5)}

      .vidopt__icon{flex:0 0 auto; width:48px; height:48px; border-radius:12px; display:grid; place-items:center}

      .vidopt__body{flex:1; display:flex; flex-direction:column; gap:2px}

      .vidopt__body b{font-size:15px}

      .vidopt__body small{font-size:12px; color:var(--dim)}



      .upbox{display:flex; flex-direction:column; align-items:center; gap:4px; background:#1b1a15;

        border:1px dashed rgba(255,255,255,.2); border-radius:15px; padding:20px; cursor:pointer; color:var(--ink)}

      .upbox svg{color:#FF6B35}

      .upbox b{font-size:14px; font-weight:600}

      .upbox small{font-size:11px; color:var(--dim)}

      .uplist{display:flex; flex-wrap:wrap; gap:7px}

      .upitem{display:inline-flex; align-items:center; gap:5px; background:rgba(255,210,63,.12);

        border:1px solid rgba(255,210,63,.3); color:#FFD23F; font-size:12px; font-weight:600;

        padding:6px 9px; border-radius:8px}

      .upitem--solo{align-self:flex-start}

      .upitem button{background:none; border:none; color:inherit; cursor:pointer; display:grid; place-items:center; padding:0; margin-left:2px}



      .wiz__actions{flex:0 0 auto; display:flex; gap:10px; padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));

        border-top:1px solid var(--hair);
        background:linear-gradient(180deg,rgba(22,21,15,.6),rgba(15,14,12,.96));
        backdrop-filter:blur(18px) saturate(140%); -webkit-backdrop-filter:blur(18px) saturate(140%)}

      .wiz__btn{flex:1; display:flex; align-items:center; justify-content:center; gap:7px;

        padding:15px; border-radius:var(--r-md); border:none; cursor:pointer; font-weight:800; font-size:15px; color:#fff;
        box-shadow:var(--sh-accent);
        transition:background var(--dur-2) var(--ease), box-shadow var(--dur-2) var(--ease), transform var(--dur-1) var(--ease)}

      .wiz__btn:hover{transform:translateY(-1px); box-shadow:0 12px 30px rgba(255,107,53,.42)}

      .wiz__btn--ghost{flex:0 0 auto; min-width:92px; background:var(--surface) !important; color:var(--ink); box-shadow:none}
      .wiz__btn--ghost:hover{background:var(--surface-2) !important; box-shadow:none}



      /* .filters / .chip replaced by ProfessionDropdown */

      .chip{

        flex:0 0 auto; padding:7px 14px; border-radius:999px;

        background:rgba(255,255,255,.10); color:var(--ink);

        border:1px solid rgba(255,255,255,.16);

        font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap;

        backdrop-filter:blur(6px); transition:transform .12s ease;

      }

      .chip:active{transform:scale(.95)}

      .chip.is-on{font-weight:700}



      /* feed */

      .feed{flex:1; min-height:0; overflow-y:scroll; scroll-snap-type:y mandatory;

        -webkit-overflow-scrolling:touch; scrollbar-width:none;

        touch-action:pan-y; overscroll-behavior:contain}

      .feed::-webkit-scrollbar{display:none}



      .card{position:relative; height:100%; width:100%;

        scroll-snap-align:start; scroll-snap-stop:always; overflow:hidden; background:#000;

        touch-action:pan-y}

      .card__video{position:absolute; inset:0; width:100%; height:100%; cursor:pointer}

      .vintro{position:absolute; inset:0; width:100%; height:100%; display:block}

      .avatar{display:inline-flex; align-items:center; justify-content:center; border-radius:50%;

        font-family:'Barlow Condensed',sans-serif; font-weight:700; flex:0 0 auto; letter-spacing:.5px;

        text-transform:uppercase; line-height:1}

      .card__scrim{position:absolute; inset:0; pointer-events:none;

        background:linear-gradient(0deg,rgba(0,0,0,.82) 0%,rgba(0,0,0,.25) 38%,transparent 60%)}

      .card__progress{position:absolute; top:96px; left:16px; right:16px; height:3px;

        background:rgba(255,255,255,.22); border-radius:2px; z-index:15; overflow:hidden}

      .card__progress span{display:block; height:100%; border-radius:2px; transition:width .15s linear}

      .card__playhint{position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);

        z-index:14; background:rgba(0,0,0,.42); color:#fff; border:none;

        width:74px;height:74px;border-radius:50%; display:grid;place-items:center; cursor:pointer; backdrop-filter:blur(2px)}

      .card__mute{position:absolute; top:108px; right:16px; z-index:16;

        background:rgba(0,0,0,.4); color:#fff; border:none;

        width:36px;height:36px;border-radius:50%; display:grid;place-items:center; cursor:pointer}



      .rail{position:absolute; right:12px; bottom:150px; z-index:18;

        display:flex; flex-direction:column; gap:18px}

      .rail__btn{background:none; border:none; color:#fff; cursor:pointer;

        display:flex; flex-direction:column; align-items:center; gap:5px; font-size:11px; font-weight:600}

      .rail__btn span{text-shadow:0 1px 3px rgba(0,0,0,.6)}

      .rail__btn:active{transform:scale(.9)}

      .rail__btn svg{filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}



      .meta{position:absolute; left:16px; right:78px; bottom:30px; z-index:18; cursor:pointer}

      .meta__trade{display:inline-block; padding:3px 10px; border-radius:5px;

        font-family:'Barlow Condensed',sans-serif; font-weight:700;

        font-size:13px; letter-spacing:.6px; text-transform:uppercase; color:#11110f; margin-bottom:9px}

      .meta__name{font-family:'Barlow Condensed',sans-serif; font-weight:700;
        font-size:18px; line-height:1.2; letter-spacing:.2px;
        display:flex; justify-content:space-between; align-items:center; gap:8px;
        margin:0 0 8px}
      .meta__name__text{flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}
      .meta__age{font-size:inherit; opacity:0.8; font-weight:700}
      .meta__check{color:#4FA3FF; flex-shrink:0}

      .meta__pitch{font-size:13.5px; line-height:1.4; color:#ece9e2; margin:8px 0 12px; max-width:34ch}

      .meta__stats{display:flex; flex-wrap:wrap; gap:7px}

      .meta__stats span{display:inline-flex; align-items:center; gap:4px;

        background:rgba(255,255,255,.14); backdrop-filter:blur(6px);

        padding:5px 9px; border-radius:7px; font-size:12px; font-weight:500}

      .meta__stats svg{opacity:.85}

      .meta__avail{background:rgba(0,0,0,.35) !important; font-weight:600 !important}

      .meta__avail svg{opacity:1 !important}

      .meta__more{display:inline-block; margin-top:10px; font-size:12px; font-weight:600; color:#FF6B35}



      .swipehint{position:absolute; left:50%; bottom:14px; transform:translateX(-50%);

        z-index:20; display:flex; align-items:center; gap:5px; font-size:12px; color:var(--dim);

        animation:bob 1.6s ease-in-out infinite; pointer-events:none; text-align:center}

      @keyframes bob{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-5px)}}

      @keyframes spin{to{transform:rotate(360deg)}}

      @keyframes passportReward{0%{transform:scale(0.6);opacity:0}70%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}

      @keyframes pop{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}



      /* ── Дэлгэрэнгүй профайл ── */

      .detail{position:absolute; inset:0; z-index:45; background:var(--bg);

        display:flex; flex-direction:column; animation:slidein .26s cubic-bezier(.2,.8,.2,1)}

      @keyframes slidein{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}

      @keyframes livePulse{0%,100%{opacity:1;box-shadow:0 0 6px #3DDC97}50%{opacity:0.4;box-shadow:0 0 12px #3DDC97}}

      @keyframes coachDot{0%,80%,100%{transform:scale(0);opacity:.3}40%{transform:scale(1);opacity:1}}

      .detail__bar{flex:0 0 auto; display:flex; align-items:center; justify-content:space-between;

        padding:14px 14px; border-bottom:1px solid rgba(255,255,255,.07); background:#16150f; z-index:2}

      .detail__bar button{background:rgba(255,255,255,.08); border:none; color:var(--ink);

        width:36px;height:36px;border-radius:50%; display:grid;place-items:center; cursor:pointer}

      .detail__bartitle{font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:18px}

      .detail__scroll{flex:1; min-height:0; overflow-y:auto; scrollbar-width:none}

      .detail__scroll::-webkit-scrollbar{display:none}



      .detail__videowrap{position:relative; width:100%; height:52vh; background:#000; overflow:hidden}

      .detail__video{width:100%; height:100%; object-fit:cover}

      .detail__vidlabel{position:absolute; left:12px; bottom:12px; z-index:2;

        display:inline-flex; align-items:center; gap:5px; background:rgba(0,0,0,.55); backdrop-filter:blur(6px);

        color:#f5f3ee; font-size:12px; font-weight:600; padding:6px 11px; border-radius:8px}

      .detail__head{display:flex; align-items:center; gap:13px; padding:16px}

      .detail__name{font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:26px; line-height:1}

      .detail__name span{color:var(--dim)}

      .detail__trade{font-size:13px; font-weight:700}

      .detail__avail{display:flex; align-items:center; gap:5px; font-size:12px; color:var(--dim); margin-top:5px}



      .vbadges{display:flex; flex-wrap:wrap; gap:7px; padding:0 16px 6px}

      .vbadge{display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:600;

        color:#3DDC97; background:rgba(61,220,151,.12); border:1px solid rgba(61,220,151,.3);

        padding:4px 8px; border-radius:7px}



      /* feed дээрх компакт итгэлцлийн badge-ууд */

      .vchips{display:flex; flex-wrap:wrap; gap:6px; margin:0 0 11px}

      .vchip{display:inline-flex; align-items:center; gap:4px; font-size:11.5px; font-weight:600;

        color:#3DDC97; background:rgba(61,220,151,.18); border:1px solid rgba(61,220,151,.45);

        padding:5px 9px; border-radius:7px; backdrop-filter:blur(6px); text-shadow:none}

      .vchip svg{flex:0 0 auto}



      /* итгэлцлийн хэмжүүр (профайл) */

      .trust{margin:6px 16px 4px; background:#16150f; border:1px solid rgba(61,220,151,.22);

        border-radius:14px; padding:13px 14px}

      .trust__top{display:flex; align-items:center; justify-content:space-between; margin-bottom:9px}

      .trust__title{display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color:#f5f3ee}

      .trust__title svg{color:#3DDC97}

      .trust__score{font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:18px}

      .trust__bar{display:flex; gap:5px}

      .trust__seg{flex:1; height:6px; border-radius:3px; background:rgba(255,255,255,.1)}

      .trust__seg.is-on{background:#3DDC97}

      .trust__badge{display:inline-flex; align-items:center; gap:5px; margin-top:10px;

        font-size:11.5px; font-weight:600; color:#3DDC97}



      .detail__quick{display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:12px 16px}

      .detail__quick > div{background:#1b1a15; border:1px solid rgba(255,255,255,.06);

        border-radius:13px; padding:11px 8px; display:flex; flex-direction:column; align-items:center; gap:3px; text-align:center}

      .detail__quick svg{color:var(--dim)}

      .detail__quick b{font-size:13px; font-family:'Barlow Condensed',sans-serif; font-weight:700}

      .detail__quick small{font-size:10px; color:var(--dim)}



      /* AI дүгнэлт */

      /* AI Resume Summary — профайлын дээд, HR 5 секундэд ойлгоно */

      .resume{margin:14px 16px 4px; background:linear-gradient(135deg,rgba(255,107,53,.16),rgba(255,210,63,.06));

        border:1px solid rgba(255,107,53,.35); border-radius:16px; padding:14px 15px}

      .resume__head{display:inline-flex; align-items:center; gap:6px; font-size:11px; font-weight:700;

        letter-spacing:.5px; text-transform:uppercase; color:#FF6B35; margin-bottom:8px}

      .resume__text{font-size:14.5px; line-height:1.55; color:#f0ede6; font-weight:500}



      .ai{margin:8px 16px 4px; background:linear-gradient(135deg,rgba(255,107,53,.14),rgba(255,210,63,.08));

        border:1px solid rgba(255,107,53,.3); border-radius:16px; padding:14px}

      .ai__head{display:flex; align-items:center; gap:7px; font-weight:700; font-size:14px; color:#FF6B35; margin-bottom:11px}

      .ai__grid{display:grid; grid-template-columns:1fr 1fr; gap:9px; margin-bottom:11px}

      .ai__cell{background:rgba(0,0,0,.25); border-radius:11px; padding:9px 11px}

      .ai__cell--wide{grid-column:1/-1}

      .ai__cell small{display:block; font-size:10.5px; color:var(--dim); margin-bottom:3px}

      .ai__cell b{font-size:13.5px; line-height:1.25}

      .ai__strengths small{font-size:10.5px; color:var(--dim)}

      .ai__chips{display:flex; flex-wrap:wrap; gap:6px; margin-top:6px}

      .ai__chip{display:inline-flex; align-items:center; gap:4px; font-size:11.5px; font-weight:600;

        background:rgba(0,0,0,.25); border:1px solid; border-radius:999px; padding:4px 10px}

      .ai__chip svg{color:#3DDC97}



      .sec{padding:14px 16px 4px; border-top:1px solid rgba(255,255,255,.05); margin-top:10px}

      .sec__head{display:flex; align-items:center; gap:7px; font-family:'Barlow Condensed',sans-serif;

        font-weight:700; font-size:17px; margin-bottom:10px; color:var(--ink)}

      .sec__head svg{color:#FF6B35}



      .stages{display:flex; flex-wrap:wrap; gap:7px}

      .stage{padding:7px 12px; border-radius:999px; background:rgba(255,255,255,.08);

        border:1px solid rgba(255,255,255,.16); color:var(--ink); font-size:12px; font-weight:600; cursor:pointer}

      .stage.is-on{font-weight:700}



      .detail__about{font-size:13.5px; line-height:1.55; color:#d8d5cd}



      .transcript__toggle{background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.16);

        color:var(--ink); font-size:12.5px; font-weight:600; padding:8px 14px; border-radius:10px; cursor:pointer}

      .transcript{margin-top:10px; font-size:13px; line-height:1.6; color:#d8d5cd; font-style:italic;

        background:#1b1a15; border-radius:12px; padding:12px 14px; border-left:3px solid #FF6B35}



      .taglist{display:flex; flex-wrap:wrap; gap:7px}

      .tag{font-size:12px; font-weight:500; background:rgba(255,255,255,.1);

        padding:6px 11px; border-radius:8px}



      .linelist{list-style:none; display:flex; flex-direction:column; gap:8px}

      .linelist li{display:flex; align-items:center; gap:8px; font-size:13px; color:#d8d5cd}

      .linelist svg{color:#FFD23F; flex:0 0 auto}



      .timeline{list-style:none; display:flex; flex-direction:column; gap:13px}

      .timeline li{position:relative; padding-left:16px; display:flex; flex-direction:column; gap:1px}

      .timeline li::before{content:""; position:absolute; left:0; top:5px; width:7px; height:7px;

        border-radius:50%; background:#FF6B35}

      .timeline b{font-size:14px}

      .timeline span{font-size:12.5px; color:#bbb7ad}

      .timeline small{font-size:11px; color:var(--dim)}



      .note{width:100%; background:#1b1a15; border:1px solid rgba(255,255,255,.12); border-radius:12px;

        color:var(--ink); font-family:inherit; font-size:13px; line-height:1.5; padding:11px 13px; resize:vertical}

      .note:focus{outline:none; border-color:#FF6B35}

      .note__hint{display:block; font-size:11px; color:var(--dim); margin-top:5px}



      .detail__actions{flex:0 0 auto; display:flex; gap:10px; padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));

        border-top:1px solid var(--hair);
        background:linear-gradient(180deg,rgba(22,21,15,.6),rgba(15,14,12,.96));
        backdrop-filter:blur(18px) saturate(140%); -webkit-backdrop-filter:blur(18px) saturate(140%)}

      .detail__act{flex:1; display:flex; align-items:center; justify-content:center; gap:7px;

        padding:14px; border-radius:var(--r-md); border:none; cursor:pointer; font-weight:800; font-size:14.5px; color:#fff;
        box-shadow:var(--sh-accent);
        transition:transform var(--dur-1) var(--ease), box-shadow var(--dur-2) var(--ease), background var(--dur-2) var(--ease)}

      .detail__act:hover{transform:translateY(-1px); box-shadow:0 12px 30px rgba(255,107,53,.42)}

      .detail__act--ghost{background:var(--surface); color:var(--ink); box-shadow:none}
      .detail__act--ghost:hover{background:var(--surface-2); box-shadow:none}



      /* холбоо барих цонх */

      .sheet{position:fixed; inset:0; z-index:50; background:rgba(0,0,0,.6);

        display:flex; align-items:flex-end; justify-content:center; animation:fade .2s ease; max-width:440px; margin:0 auto}

      .sheet__panel{width:100%; max-width:440px; background:#1b1a17; border-radius:22px 22px 0 0;

        padding:26px 22px 34px; position:relative; text-align:center;

        animation:rise .26s cubic-bezier(.2,.8,.2,1); border-top:1px solid rgba(255,255,255,.08)}

      .sheet__close{position:absolute; top:16px; right:16px; background:rgba(255,255,255,.1);

        border:none; color:var(--ink); width:32px;height:32px;border-radius:50%; display:grid;place-items:center;cursor:pointer}

      .sheet__avatar{margin:0 auto 12px; display:flex; justify-content:center}

      .sheet__name{font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:24px}

      .sheet__role{font-size:13px; font-weight:600; margin:3px 0 18px}

      .sheet__action{display:flex; align-items:center; justify-content:center; gap:8px;

        width:100%; padding:14px; border-radius:13px; text-decoration:none; color:#11110f; font-weight:700; font-size:15px; margin-bottom:10px}

      .sheet__action--ghost{background:rgba(255,255,255,.1); color:var(--ink)}

      .sheet__note{font-size:11.5px; color:var(--dim); margin-top:6px; line-height:1.4}



      /* toast */

      .toast{position:fixed; bottom:calc(var(--tabh) + 18px); left:50%; transform:translateX(-50%); z-index:60;

        background:#222; color:#fff; padding:11px 16px; border-radius:11px;

        display:flex; align-items:center; gap:7px; font-size:13.5px; font-weight:500;

        box-shadow:0 8px 24px rgba(0,0,0,.4); animation:rise .24s ease; border:1px solid rgba(255,255,255,.08)}

      .toast svg{color:#3DDC97}



      .empty{height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;

        gap:14px; padding:0 30px; text-align:center; color:var(--dim)}

      .empty button{background:#FF6B35; color:#11110f; border:none; padding:11px 20px; border-radius:11px; font-weight:700; cursor:pointer}



      /* доод таб */

      .tabbar{flex:0 0 var(--tabh); display:flex; align-items:stretch;
        background:linear-gradient(180deg,rgba(20,19,16,.72),rgba(15,14,12,.94));
        backdrop-filter:blur(20px) saturate(140%); -webkit-backdrop-filter:blur(20px) saturate(140%);
        border-top:1px solid var(--hair); z-index:40;
        padding-bottom:env(safe-area-inset-bottom,0px)}

      .tabbar__btn{flex:1; background:none; border:none; cursor:pointer; color:var(--dim);
        display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
        font-size:10.5px; font-weight:600; letter-spacing:-.1px; min-width:0; position:relative;
        transition:color var(--dur-2) var(--ease)}

      @media (max-width:380px){.tabbar__btn{font-size:9.5px; gap:3px}}
      @media (max-width:380px){.topbar--premium{gap:6px; padding:8px 10px}}

      .tabbar__btn svg{transition:transform var(--dur-2) var(--ease)}
      .tabbar__btn.is-on{color:var(--ink); font-weight:700}
      .tabbar__btn.is-on svg{color:var(--accent); transform:translateY(-1px) scale(1.08)}
      /* active pill indicator above the icon */
      .tabbar__btn.is-on::before{content:""; position:absolute; top:7px; width:22px; height:3px;
        border-radius:var(--r-pill); background:linear-gradient(90deg,var(--accent-2),var(--accent-deep));
        box-shadow:0 0 10px rgba(255,107,53,.6); animation:sh_pop var(--dur-2) var(--ease) both}

      .tabbar__icon{position:relative; display:inline-flex}

      .tabbar__icon em{position:absolute; top:-6px; right:-9px;
        background:linear-gradient(135deg,var(--accent-2),var(--accent-deep)); color:#fff;
        font-style:normal; font-size:10px; font-weight:800; line-height:1; min-width:16px; height:16px;
        padding:0 4px; border-radius:var(--r-pill); display:grid; place-items:center;
        box-shadow:0 2px 8px rgba(255,107,53,.5)}



      /* самбар/хадгалсан панел */

      .panel{flex:1; min-height:0; overflow-y:auto; padding-top:calc(64px + var(--sat)); scrollbar-width:none}

      .panel::-webkit-scrollbar{display:none}



      .shortlist{padding:4px 14px 24px}

      .shortlist__head{display:flex; align-items:baseline; justify-content:space-between; padding:4px 2px 14px}

      .shortlist__head h2{font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:26px; letter-spacing:.3px}

      .shortlist__head span{font-size:12px; color:var(--dim); font-weight:600}

      .shortlist__list{list-style:none; display:flex; flex-direction:column; gap:11px}

      .srow{display:flex; align-items:center; gap:12px; padding:10px; background:#1b1a15;

        border:1px solid rgba(255,255,255,.06); border-radius:15px}

      .srow__poster{flex:0 0 56px; height:56px; display:flex; align-items:center; justify-content:center; cursor:pointer; position:relative}

      .srow__verify{position:absolute; bottom:-2px; right:-4px; display:inline-flex; align-items:center; gap:2px;

        background:#3DDC97; color:#11110f; font-size:10px; font-weight:700; line-height:1;

        padding:3px 5px; border-radius:7px; border:2px solid #1b1a15}

      .srow__body{flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; cursor:pointer}

      .srow__name{font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:18px;

        line-height:1.1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis}

      .srow__name span{color:var(--dim)}

      .srow__trade{font-size:11.5px; font-weight:600}

      .srow__stage{font-size:11px; font-weight:600; display:inline-flex; align-items:center; gap:4px}

      .srow__acts{display:flex; gap:4px; flex:0 0 auto}

      .srow__acts button{width:34px; height:34px; border-radius:9px; border:none; cursor:pointer;

        background:rgba(255,255,255,.08); color:var(--ink); display:grid; place-items:center; transition:transform .12s ease}

      .srow__acts button:active{transform:scale(.9)}

      .srow__del{color:#ff7a7a !important}



      .shortlist__empty, .dash__empty{height:auto; display:flex; flex-direction:column; align-items:center;

        justify-content:center; gap:10px; padding:60px 40px; text-align:center; color:var(--dim)}

      .shortlist__empty h3{font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:20px; color:var(--ink); margin-top:4px}

      .shortlist__empty p, .dash__empty p{font-size:13px; line-height:1.45; max-width:30ch}

      .shortlist__empty button, .dash__empty button{margin-top:8px; background:#FF6B35; color:#11110f; border:none;

        padding:11px 20px; border-radius:11px; font-weight:700; cursor:pointer}



      /* Dashboard */

      .dash{padding:4px 14px 24px}

      .dash__head{display:flex; align-items:baseline; justify-content:space-between; padding:4px 2px 14px}

      .dash__head h2{font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:26px}

      .dash__head span{font-size:12px; color:var(--dim); font-weight:600}

      .dash__cards{display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:18px}

      .dcard{background:#1b1a15; border:1px solid rgba(255,255,255,.07); border-radius:16px;

        padding:14px; display:flex; flex-direction:column; gap:4px; position:relative; overflow:hidden}

      .dcard__bar{position:absolute; left:0; top:0; bottom:0; width:4px}

      .dcard__num{font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:30px; line-height:1}

      .dcard__label{font-size:12px; color:var(--dim); font-weight:600}



      .dash__subhead, .dash__pipeline .dash__subhead{font-family:'Barlow Condensed',sans-serif;

        font-weight:700; font-size:17px; margin:4px 2px 12px}

      .pipe{margin-bottom:16px}

      .pipe__label{display:flex; align-items:center; gap:6px; font-size:13px; font-weight:700; margin-bottom:8px}

      .pipe__label em{font-style:normal; color:var(--dim); font-weight:600; font-size:12px}

      .pipe__people{list-style:none; display:flex; flex-direction:column; gap:8px}

      .pipe__people li{display:flex; align-items:center; gap:11px; background:#1b1a15;

        border:1px solid rgba(255,255,255,.06); border-radius:13px; padding:9px 11px; cursor:pointer}

      .pipe__people .avatar{flex:0 0 auto}

      .pipe__people b{font-size:14px; display:block}

      .pipe__people small{font-size:11.5px; color:var(--dim)}

      .pipe__people > li > div{flex:1; min-width:0}



      @keyframes fade{from{opacity:0}to{opacity:1}}

      @keyframes rise{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}
      @keyframes dashFadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      @keyframes splashDot{0%,80%,100%{transform:scale(0.6);opacity:0.35}40%{transform:scale(1);opacity:1}}

      @media (prefers-reduced-motion:reduce){*{animation:none!important}}

      /* ── Workplace Insights ── */
      @keyframes insightBarGrow{from{width:0}to{}}
      .insight-bar-fill{animation:insightBarGrow 0.9s cubic-bezier(0.4,0,0.2,1) both}
      .insights-glass{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:16px 18px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}

    `}</style>

  );

}
