export function requireAdmin(req, res, next) {
  if (!req.user || !['admin', 'company_admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs'
    });
  }

  return next();
}

export function requireInternalUser(req, res, next) {
  if (!req.user || !['admin', 'company_admin', 'employee'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux utilisateurs internes'
    });
  }

  return next();
}

export function requireClient(req, res, next) {
  if (!req.user || req.user.role !== 'client') {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé au portail client.'
    });
  }

  return next();
}

export function requireRole(...roles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permission insuffisante.'
      });
    }

    return next();
  };
}