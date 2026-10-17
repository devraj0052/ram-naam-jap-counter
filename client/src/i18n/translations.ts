export interface TranslationDictionary {
  appTitle: string;
  ramMantra: string;
  tapToCount: string;
  likhitJapMode: string;
  tapJapMode: string;
  typeRamPlaceholder: string;
  todayCount: string;
  lifetimeCount: string;
  todayMalas: string;
  totalMalas: string;
  targetMalas: string;
  dailyTarget: string;
  malaProgress: string;
  beadCount: string;
  dayStreak: string;
  longestStreak: string;
  sound: string;
  vibration: string;
  synced: string;
  syncing: string;
  offline: string;
  guestMode: string;
  syncNow: string;
  lastSynced: string;
  login: string;
  register: string;
  logout: string;
  profile: string;
  history: string;
  darshan: string;
  home: string;
  settings: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  forgotPassword: string;
  resetPassword: string;
  verifyEmail: string;
  verificationCode: string;
  resendCode: string;
  changePassword: string;
  currentPassword: string;
  newPassword: string;
  exportBackup: string;
  importBackup: string;
  deleteAccount: string;
  deleteWarning: string;
  confirmDelete: string;
  guestMergeTitle: string;
  guestMergeDesc: string;
  mergeData: string;
  keepCloudOnly: string;
  installApp: string;
  installAppDesc: string;
  malaCompleted: string;
  targetReached: string;
  theme: string;
  language: string;
  saffronTheme: string;
  darkTheme: string;
  lightTheme: string;
}

export const translations: Record<'en' | 'gu' | 'hi', TranslationDictionary> = {
  en: {
    appTitle: 'Shri Ram Naam Jap Counter',
    ramMantra: '|| Jai Shri Ram ||',
    tapToCount: 'Tap to Count Ram Naam',
    likhitJapMode: 'Written Jap (Likhit)',
    tapJapMode: 'Tap Jap Mode',
    typeRamPlaceholder: "Type 'Ram' or 'राम' to chant...",
    todayCount: "Today's Jap",
    lifetimeCount: 'Lifetime Jap',
    todayMalas: "Today's Malas",
    totalMalas: 'Total Malas',
    targetMalas: 'Target Malas',
    dailyTarget: 'Daily Target',
    malaProgress: 'Current Mala',
    beadCount: 'Bead',
    dayStreak: 'Day Streak',
    longestStreak: 'Best Streak',
    sound: 'Chime Sound',
    vibration: 'Haptic Vibration',
    synced: 'Cloud Synced',
    syncing: 'Syncing...',
    offline: 'Offline Mode (Saved)',
    guestMode: 'Guest Mode (Local)',
    syncNow: 'Sync Now',
    lastSynced: 'Last Synced',
    login: 'Login',
    register: 'Create Account',
    logout: 'Log Out',
    profile: 'My Profile & Account',
    history: 'Jap History & Stats',
    darshan: 'Divine Darshan',
    home: 'Jap Counter',
    settings: 'Settings',
    fullName: 'Full Name',
    email: 'Email Address',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    forgotPassword: 'Forgot Password?',
    resetPassword: 'Reset Password',
    verifyEmail: 'Verify Email',
    verificationCode: '6-Digit Verification Code',
    resendCode: 'Resend Verification Code',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    exportBackup: 'Export Jap Data (JSON / TXT)',
    importBackup: 'Restore Backup / Legacy Data',
    deleteAccount: 'Delete Account Permanently',
    deleteWarning: 'This action is irreversible. All your jap logs, sessions, and cloud stats will be erased.',
    confirmDelete: 'Confirm Deletion',
    guestMergeTitle: 'Guest Jap Data Detected',
    guestMergeDesc: 'You have accumulated jap counts while counting as guest. Would you like to merge this data into your account?',
    mergeData: 'Yes, Merge My Jap Data',
    keepCloudOnly: 'No, Keep Account Data Only',
    installApp: 'Install Mobile App',
    installAppDesc: 'Install Shri Ram Jap Counter for quick offline access on your home screen.',
    malaCompleted: 'Mala Completed! (108 Ram Naam)',
    targetReached: 'Congratulations! Daily Target Achieved! 🚩',
    theme: 'Theme',
    language: 'Language',
    saffronTheme: 'Devotional Saffron',
    darkTheme: 'Midnight Dark',
    lightTheme: 'Ivory Light',
  },
  gu: {
    appTitle: 'શ્રી રામ નામ જાપ કાઉન્ટર',
    ramMantra: '|| જય શ્રી રામ ||',
    tapToCount: 'રામ નામ જાપ માટે ટેપ કરો',
    likhitJapMode: 'લિખિત જાપ મોડ',
    tapJapMode: 'ટેપ જાપ મોડ',
    typeRamPlaceholder: "'રામ' લખીને જાપ કરો...",
    todayCount: 'આજનો જાપ',
    lifetimeCount: 'જીવનભરનો જાપ',
    todayMalas: 'આજની માળા',
    totalMalas: 'કુલ માળા',
    targetMalas: 'લક્ષ્ય માળા',
    dailyTarget: 'દૈનિક લક્ષ્ય',
    malaProgress: 'વર્તમાન માળા',
    beadCount: 'મણકો',
    dayStreak: 'દૈનિક સાતત્ય',
    longestStreak: 'શ્રેષ્ઠ સાતત્ય',
    sound: 'ધ્વનિ',
    vibration: 'સ્પંદન (વાઇબ્રેશન)',
    synced: 'ક્લાઉડ સમન્વયિત',
    syncing: 'સમન્વય ચાલુ છે...',
    offline: 'ઑફલાઇન મોડ (સ્થાનિક)',
    guestMode: 'અતિથિ મોડ (સ્થાનિક)',
    syncNow: 'હમણાં સિંક કરો',
    lastSynced: 'છેલ્લો સિંક',
    login: 'પ્રવેશ (Login)',
    register: 'નવું ખાતું બનાવો',
    logout: 'બહાર નીકળો (Logout)',
    profile: 'પ્રોફાઇલ અને ખાતું',
    history: 'જાપ ઇતિહાસ અને આંકડા',
    darshan: 'દિવ્ય દર્શન',
    home: 'જાપ કાઉન્ટર',
    settings: 'સેટિંગ્સ',
    fullName: 'પૂરું નામ',
    email: 'ઈમેલ સરનામું',
    password: 'પાસવર્ડ',
    confirmPassword: 'પાસવર્ડની પુષ્ટિ કરો',
    forgotPassword: 'પાસવર્ડ ભૂલી ગયા?',
    resetPassword: 'પાસવર્ડ ફરી સેટ કરો',
    verifyEmail: 'ઈમેલ ચકાસો',
    verificationCode: '૬-અંકનો ચકાસણી કોડ',
    resendCode: 'કોડ ફરીથી મોકલો',
    changePassword: 'પાસવર્ડ બદલો',
    currentPassword: 'હાલનો પાસવર્ડ',
    newPassword: 'નવો પાસવર્ડ',
    exportBackup: 'ડેટા નિકાસ કરો (JSON / TXT)',
    importBackup: 'બેકઅપ પુનઃસ્થાપિત કરો',
    deleteAccount: 'ખાતું કાયમી માટે કાઢી નાખો',
    deleteWarning: 'આ ક્રિયા પૂર્વવત્ કરી શકાતી નથી. તમામ ક્લાઉડ ડેટા ભૂંસી નાખવામાં આવશે.',
    confirmDelete: 'કાઢી નાખવાની પુષ્ટિ કરો',
    guestMergeTitle: 'અતિથિ જાપ ડેટા મળ્યો',
    guestMergeDesc: 'તમે અતિથિ તરીકે જાપ કર્યો છે. શું તમે આ જાપ તમારા ખાતામાં ઉમેરવા માંગો છો?',
    mergeData: 'હા, જાપ ડેટા ઉમેરો',
    keepCloudOnly: 'ના, ફક્ત ક્લાઉડ ડેટા રાખો',
    installApp: 'મોબાઇલ એપ્લિકેશન ઇન્સ્ટોલ કરો',
    installAppDesc: 'હોમ સ્ક્રીન પરથી ઝડપી ઑફલાઇન જાપ માટે એપ્લિકેશન ઇન્સ્ટોલ કરો.',
    malaCompleted: 'માળા પૂર્ણ થઈ! (૧૦૮ રામ નામ)',
    targetReached: 'અભિનંદન! આજનું દૈનિક લક્ષ્ય પૂર્ણ થયું! 🚩',
    theme: 'થીમ',
    language: 'ભાષા',
    saffronTheme: 'કેસરી ભક્તિ',
    darkTheme: 'શ્યામ (ડાર્ક)',
    lightTheme: 'શ્વેત (લાઇટ)',
  },
  hi: {
    appTitle: 'श्री राम नाम जप काउंटर',
    ramMantra: '|| जय श्री राम ||',
    tapToCount: 'राम नाम जप के लिए स्पर्श करें',
    likhitJapMode: 'लिखित जप मोड',
    tapJapMode: 'स्पर्श जप मोड',
    typeRamPlaceholder: "'राम' लिखकर जप करें...",
    todayCount: 'आज का जप',
    lifetimeCount: 'आजीवन जप',
    todayMalas: 'आज की मालाएं',
    totalMalas: 'कुल मालाएं',
    targetMalas: 'लक्ष्य माला',
    dailyTarget: 'दैनिक लक्ष्य',
    malaProgress: 'वर्तमान माला',
    beadCount: 'मनका',
    dayStreak: 'नियमितता (दिन)',
    longestStreak: 'सर्वश्रेष्ठ नियमितता',
    sound: 'ध्वनि',
    vibration: 'कंपन (वाइब्रेशन)',
    synced: 'क्लाउड सिंक संपन्न',
    syncing: 'सिंक हो रहा है...',
    offline: 'ऑफ़लाइन मोड (सुरक्षित)',
    guestMode: 'अतिथि मोड (लोकल)',
    syncNow: 'अभी सिंक करें',
    lastSynced: 'अंतिम सिंक',
    login: 'लॉग इन करें',
    register: 'नया खाता बनाएं',
    logout: 'लॉग आउट',
    profile: 'मेरी प्रोफाइल एवं खाता',
    history: 'जप इतिहास एवं आंकड़े',
    darshan: 'दिव्य दर्शन',
    home: 'जप काउंटर',
    settings: 'सेटिंग्स',
    fullName: 'पूरा नाम',
    email: 'ईमेल पता',
    password: 'पासवर्ड',
    confirmPassword: 'पासवर्ड की पुष्टि करें',
    forgotPassword: 'पासवर्ड भूल गए?',
    resetPassword: 'पासवर्ड रीसेट करें',
    verifyEmail: 'ईमेल सत्यापित करें',
    verificationCode: '६-अंकों का सत्यापन कोड',
    resendCode: 'सत्यापन कोड पुनः भेजें',
    changePassword: 'पासवर्ड बदलें',
    currentPassword: 'वर्तमान पासवर्ड',
    newPassword: 'नया पासवर्ड',
    exportBackup: 'डेटा बैकअप निकालें (JSON / TXT)',
    importBackup: 'बैकअप पुनर्स्थापित करें',
    deleteAccount: 'खाता स्थायी रूप से हटाएं',
    deleteWarning: 'यह क्रिया अपरिवर्तनीय है। आपके सभी जप रिकॉर्ड एवं आंकड़े स्थायी रूप से हटा दिए जाएंगे।',
    confirmDelete: 'हटाने की पुष्टि करें',
    guestMergeTitle: 'अतिथि जप डेटा प्राप्त हुआ',
    guestMergeDesc: 'आपने अतिथि रूप में जप किया है। क्या आप इस जप डेटा को अपने पंजीकृत खाते में जोड़ना चाहते हैं?',
    mergeData: 'हाँ, जप डेटा जोड़ें',
    keepCloudOnly: 'नहीं, केवल क्लाउड डेटा रखें',
    installApp: 'मोबाइल ऐप इंस्टॉल करें',
    installAppDesc: 'होम स्क्रीन से त्वरित ऑफ़लाइन उपयोग के लिए श्री राम जप ऐप इंस्टॉल करें।',
    malaCompleted: 'माला संपन्न हुई! (१०८ राम नाम)',
    targetReached: 'बधाई हो! आज का दैनिक लक्ष्य पूर्ण हुआ! 🚩',
    theme: 'थीम',
    language: 'भाषा',
    saffronTheme: 'भगवा भक्ति',
    darkTheme: 'गहरा (डार्क)',
    lightTheme: 'श्वेत (लाइट)',
  },
};
