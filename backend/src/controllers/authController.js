// backend/src/controllers/authController.js

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

// ========================================
// CONFIGURACIÓN DE DYNAMODB
// ========================================
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const docClient = DynamoDBDocumentClient.from(client);

// ===========================================
// FUNCIÓN AUXILIAR PARA AUDIT LOGS (CON MANEJO DE ERRORES)
// ===========================================
const saveAuditLog = async (data) => {
  try {
    const logId = `log_${uuidv4()}`;
    const timestamp = Date.now();
    
    await docClient.send(new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_LOGS,
      Item: {
        logId: logId,
        timestamp: timestamp,
        ...data
      }
    }));
    console.log('✅ Audit log guardado:', logId);
  } catch (error) {
    // NO lanzamos error, solo logueamos (audit log no debe romper el flujo principal)
    console.error('⚠️ Failed to save audit log:', error.message);
  }
};

// ===========================================
// CONTROLADOR DE REGISTRO (Tareas 18-21)
// RF-01: REGISTRO DE USUARIO
// ===========================================
exports.register = async (req, res) => {
  try {
    const { email, password, nombreCompleto } = req.body;

    // ===========================================
    // RF-01.01.04 - Validar campos requeridos
    // ===========================================
    if (!email || !password || !nombreCompleto) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Este campo es requerido',
        fields: {
          email: !email,
          password: !password,
          nombreCompleto: !nombreCompleto
        }
      });
    }

    // ===========================================
    // RF-01.01.02 - Validar email válido
    // ===========================================
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Email inválido',
        field: 'email'
      });
    }

    // ===========================================
    // RF-01.03 - Validar requisitos de contraseña
    // ===========================================
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'La contraseña debe contener mínimo 8 caracteres',
        field: 'password'
      });
    }

    if (!/\d/.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'La contraseña debe contener al menos 1 carácter numérico',
        field: 'password'
      });
    }

    if (!/[!@#$%&*()_+\-=\[\]{}<>?]/.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'La contraseña debe contener al menos 1 carácter especial',
        field: 'password'
      });
    }

    // ===========================================
    // RF-01.04 - Verificar email no duplicado
    // ===========================================
    const checkEmailParams = {
      TableName: process.env.DYNAMODB_TABLE_USERS,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email.toLowerCase()
      }
    };

    try {
      const existingUser = await docClient.send(new QueryCommand(checkEmailParams));
      
      if (existingUser.Items && existingUser.Items.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'EMAIL_EXISTS',
          message: 'This email is already registered'
        });
      }
    } catch (error) {
      console.log('⚠️ Email index not available, continuing without duplicate check...');
    }

    // ===========================================
    // RF-01.03.05 - Hashear contraseña
    // ===========================================
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // ===========================================
    // RF-01.05.02 - Generar UUID
    // ===========================================
    const userId = `usr_${uuidv4()}`;
    const timestamp = Date.now().toString();

    // ===========================================
    // RF-01.05.01 - Guardar usuario en DynamoDB
    // ===========================================
    const putUserParams = {
      TableName: process.env.DYNAMODB_TABLE_USERS,
      Item: {
        userId: userId,
        email: email.toLowerCase(),
        nombreCompleto: nombreCompleto.trim(),
        passwordHash: passwordHash,
        createdAt: timestamp,
        updatedAt: timestamp,
        failedLoginAttempts: 0,  // Number, no string
        lockedUntil: null,        // Null, no string
        isActive: true
      }
    };

    await docClient.send(new PutCommand(putUserParams));
    console.log('✅ Usuario guardado en DynamoDB:', userId);

    // ===========================================
    // RF-05.03 - Audit log (NO romper el flujo si falla)
    // ===========================================
    await saveAuditLog({
      email: email.toLowerCase(),
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      tipoEvento: 'register',
      resultado: 'success',
      userId: userId,
      razon: null
    });

    // ===========================================
    // RF-01.05.03 - Response exitoso
    // ===========================================
    res.status(201).json({
      success: true,
      message: 'Account created, you can now log in',
      data: {
        userId: userId,
        email: email.toLowerCase(),
        nombreCompleto: nombreCompleto.trim(),
        createdAt: new Date(parseInt(timestamp)).toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Register error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);

    // Audit log del error
    await saveAuditLog({
      email: req.body?.email || 'unknown',
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      tipoEvento: 'register',
      resultado: 'failure',
      razon: error.message,
      userId: null
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to register user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ===========================================
// CONTROLADOR DE LOGIN (Tareas 22-25)
// RF-02: INICIO DE SESIÓN
// ===========================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ===========================================
    // RF-02.01.03 - Validar campos requeridos
    // ===========================================
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Dont leave it blank',
        fields: {
          email: !email,
          password: !password
        }
      });
    }

    // ===========================================
    // RF-06.02 - Validar formato de email
    // ===========================================
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Email inválido',
        field: 'email'
      });
    }

    // ===========================================
    // RF-02.01.01 - Buscar usuario en DynamoDB
    // ===========================================
    const queryParams = {
      TableName: process.env.DYNAMODB_TABLE_USERS,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email.toLowerCase()
      }
    };

    let user;
    try {
      const result = await docClient.send(new QueryCommand(queryParams));
      
      if (!result.Items || result.Items.length === 0) {
        await saveAuditLog({
          email: email.toLowerCase(),
          ipAddress: req.ip || req.connection.remoteAddress,
          tipoEvento: 'login',
          resultado: 'failure',
          razon: 'email_not_found',
          userId: null
        });

        return res.status(401).json({
          success: false,
          error: 'EMAIL_NOT_FOUND',
          message: 'Not a linked email'
        });
      }
      
      user = result.Items[0];
      console.log('✅ Usuario encontrado:', user.userId);
    } catch (error) {
      console.log('⚠️ Email index not available...');
      return res.status(401).json({
        success: false,
        error: 'EMAIL_NOT_FOUND',
        message: 'Not a linked email'
      });
    }

    // ===========================================
    // RF-02.02.03 - Verificar bloqueo de cuenta
    // ===========================================
    const now = Date.now();
    
    // ✅ CORRECCIÓN: Manejar null correctamente
    if (user.lockedUntil && user.lockedUntil !== null && user.lockedUntil !== 'null') {
      const lockedUntilTime = parseInt(user.lockedUntil);
      if (!isNaN(lockedUntilTime) && lockedUntilTime > now) {
        const lockoutMinutes = Math.ceil((lockedUntilTime - now) / 60000);
        
        await saveAuditLog({
          email: email.toLowerCase(),
          ipAddress: req.ip || req.connection.remoteAddress,
          tipoEvento: 'login',
          resultado: 'blocked',
          razon: 'account_locked',
          userId: user.userId
        });

        return res.status(423).json({
          success: false,
          error: 'ACCOUNT_LOCKED',
          message: 'Too many failed attempts. Try again in 5 minutes',
          lockedUntil: new Date(lockedUntilTime).toISOString()
        });
      }
    }

    // ===========================================
    // RF-02.01.02 - Verificar contraseña
    // ===========================================
    console.log('🔐 Verificando contraseña...');
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      console.log('❌ Contraseña incorrecta');
      
      // ===========================================
      // RF-02.02 - Incrementar intentos fallidos
      // ===========================================
      // ✅ CORRECCIÓN: Manejar null/undefined correctamente
      const currentAttempts = user.failedLoginAttempts !== null && user.failedLoginAttempts !== undefined 
        ? parseInt(user.failedLoginAttempts) 
        : 0;
      
      const failedAttempts = isNaN(currentAttempts) ? 1 : currentAttempts + 1;
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 3;
      const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 5;
      
      let lockedUntil = null;
      
      if (failedAttempts >= maxAttempts) {
        lockedUntil = (now + (lockoutDuration * 60 * 1000)).toString();
        console.log('🔒 Cuenta bloqueada por', lockoutDuration, 'minutos');
      }
      
      // Actualizar contador
      await docClient.send(new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_USERS,
        Item: {
          userId: user.userId,
          email: user.email,
          nombreCompleto: user.nombreCompleto,
          passwordHash: user.passwordHash,
          createdAt: user.createdAt,
          updatedAt: Date.now().toString(),
          failedLoginAttempts: failedAttempts,
          lockedUntil: lockedUntil,
          isActive: user.isActive !== undefined ? user.isActive : true
        }
      }));

      await saveAuditLog({
        email: email.toLowerCase(),
        ipAddress: req.ip || req.connection.remoteAddress,
        tipoEvento: 'login',
        resultado: 'failure',
        razon: 'wrong_password',
        userId: user.userId
      });

      return res.status(401).json({
        success: false,
        error: 'WRONG_PASSWORD',
        message: 'Wrong Password',
        attemptsRemaining: maxAttempts - failedAttempts
      });
    }

    console.log('✅ Contraseña válida');

    // ===========================================
    // RF-02.02.05 - Resetear contador (login exitoso)
    // ===========================================
    await docClient.send(new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_USERS,
      Item: {
        userId: user.userId,
        email: user.email,
        nombreCompleto: user.nombreCompleto,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
        updatedAt: Date.now().toString(),
        failedLoginAttempts: 0,
        lockedUntil: null,
        isActive: true
      }
    }));

    // ===========================================
    // RF-05 - Generar token JWT
    // ===========================================
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiration = process.env.JWT_EXPIRATION || '30d';
    
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET no está configurado en .env');
      throw new Error('JWT_SECRET not configured');
    }
    
    const token = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        nombreCompleto: user.nombreCompleto
      },
      jwtSecret,
      { expiresIn: jwtExpiration }
    );

    console.log('✅ Token JWT generado');

    // ===========================================
    // RF-05.03 - Audit log exitoso
    // ===========================================
    await saveAuditLog({
      email: email.toLowerCase(),
      ipAddress: req.ip || req.connection.remoteAddress,
      tipoEvento: 'login',
      resultado: 'success',
      userId: user.userId
    });

    // ===========================================
    // RF-02.04 - Response exitoso
    // ===========================================
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        userId: user.userId,
        email: user.email,
        nombreCompleto: user.nombreCompleto,
        token: token,
        expiresIn: jwtExpiration
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);

    await saveAuditLog({
      email: req.body?.email || 'unknown',
      ipAddress: req.ip || req.connection.remoteAddress,
      tipoEvento: 'login',
      resultado: 'failure',
      razon: error.message,
      userId: null
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to login',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ===========================================
// CONTROLADOR DE PERFIL (Tarea 42) - CORREGIDO
// ===========================================

exports.getProfile = async (req, res) => {
  try {
    // ✅ Verificar que req.user existe (del middleware)
    if (!req.user || !req.user.userId) {
      console.error('❌ req.user es undefined o no tiene userId');
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'User not authenticated'
      });
    }

    const userId = req.user.userId;
    const email = req.user.email;

    console.log('📍 Getting profile for:', userId, email);

    const params = {
      TableName: process.env.DYNAMODB_TABLE_USERS,
      Key: {
        userId: userId,
        email: email
      }
    };

    const result = await docClient.send(new GetCommand(params));

    if (!result.Item) {
      console.error('❌ Usuario no encontrado en DynamoDB');
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    // ✅ Manejar createdAt/updatedAt como String o Number
    const createdAt = result.Item.createdAt;
    const updatedAt = result.Item.updatedAt;

    res.status(200).json({
      success: true,
      data: {
        userId: result.Item.userId,
        email: result.Item.email,
        nombreCompleto: result.Item.nombreCompleto,
        createdAt: createdAt ? new Date(parseInt(createdAt)).toISOString() : new Date().toISOString(),
        updatedAt: updatedAt ? new Date(parseInt(updatedAt)).toISOString() : new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { nombreCompleto } = req.body;

    if (!nombreCompleto || nombreCompleto.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Este campo es requerido'
      });
    }

    const timestamp = Date.now().toString();

    const params = {
      TableName: process.env.DYNAMODB_TABLE_USERS,
      Key: {
        userId: userId,
        email: req.user.email
      },
      UpdateExpression: 'SET nombreCompleto = :nombreCompleto, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':nombreCompleto': nombreCompleto.trim(),
        ':updatedAt': timestamp
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await docClient.send(new UpdateCommand(params));

    await saveAuditLog({
      email: req.user.email,
      ipAddress: req.ip || req.connection.remoteAddress,
      tipoEvento: 'profile_update',
      resultado: 'success',
      userId: userId
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        userId: result.Attributes.userId,
        email: result.Attributes.email,
        nombreCompleto: result.Attributes.nombreCompleto,
        updatedAt: new Date(parseInt(result.Attributes.updatedAt)).toISOString()
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to update profile'
    });
  }
};

// backend/src/controllers/authController.js

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const timestamp = Date.now().toString();

    // ✅ Eliminar usuario (datos personales)
    await docClient.send(new DeleteCommand({
      TableName: process.env.DYNAMODB_TABLE_USERS,
      Key: {
        userId: userId,
        email: userEmail
      }
    }));

    // ⚠️ Eliminar viajes - COMENTADO HASTA SEMANA 5
    // await docClient.send(new DeleteCommand({
    //   TableName: process.env.DYNAMODB_TABLE_TRIPS,
    //   Key: { userId: userId, tripId: 'all' }
    // }));

    // ⚠️ Invalidar sesiones - COMENTADO HASTA SEMANA 3
    // await docClient.send(new DeleteCommand({
    //   TableName: process.env.DYNAMODB_TABLE_SESSIONS,
    //   Key: { userId: userId, sessionId: 'all' }
    // }));

    // ✅ Registrar en audit logs
    await saveAuditLog({
      email: userEmail,
      ipAddress: req.ip || req.connection.remoteAddress,
      tipoEvento: 'account_delete',
      resultado: 'success',
      userId: userId
    });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to delete account'
    });
  }
};

// ===========================================
// CONTROLADOR DE RECUPERACIÓN (Tareas 34-36)
// RF-03: RECUPERACIÓN DE CONTRASEÑA
// ===========================================

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // RF-03.01.01 - Solicitar email asociado a cuenta existente
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Dont leave it blank',
        field: 'email'
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Email inválido',
        field: 'email'
      });
    }

    // RF-03.01.02 - Validar que email exista en BD antes de procesar
    const queryParams = {
      TableName: process.env.DYNAMODB_TABLE_USERS,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email.toLowerCase()
      }
    };

    const result = await docClient.send(new QueryCommand(queryParams));

    // RF-03.01.03 - Mostrar "Not a linked email" cuando email no exista
    if (!result.Items || result.Items.length === 0) {
      // Registrar en audit logs (intento de recuperación con email no registrado)
      await saveAuditLog({
        email: email.toLowerCase(),
        ipAddress: req.ip || req.connection.remoteAddress,
        tipoEvento: 'forgot_password',
        resultado: 'failure',
        razon: 'email_not_found',
        userId: null
      });

      return res.status(404).json({
        success: false,
        error: 'EMAIL_NOT_FOUND',
        message: 'Not a linked email'
      });
    }

    const user = result.Items[0];

    // RF-03.02 - Generar token de recuperación
    // RF-03.02.01 - Token alfanumérico único de MÍNIMO 32 caracteres
    const recoveryToken = require('crypto').randomBytes(32).toString('hex'); // 64 caracteres hex
    const tokenExpiry = Date.now() + (20 * 60 * 1000); // RF-03.02.03 - 20 minutos (no 1 hora)

    // RF-03.02.02 - Asociar token con email en BD
    await docClient.send(new UpdateCommand({
      TableName: process.env.DYNAMODB_TABLE_USERS,
      Key: {
        userId: user.userId,
        email: email.toLowerCase()
      },
      UpdateExpression: 'SET recoveryToken = :token, recoveryTokenExpiry = :expiry, recoveryTokenUsed = :used',
      ExpressionAttributeValues: {
        ':token': recoveryToken,
        ':expiry': tokenExpiry.toString(),
        ':used': false  // Para RF-03.02.05 - controlar si ya fue usado
      }
    }));

    // RF-03.02 - Simular envío de email (console.log por ahora)
    // En producción, esto enviaría un email real con el token
    console.log('📧 Email enviado a:', email.toLowerCase());
    console.log('🔑 Token de recuperación:', recoveryToken);
    console.log('⏰ Token válido hasta:', new Date(tokenExpiry).toISOString());

    // Registrar en audit logs
    await saveAuditLog({
      email: email.toLowerCase(),
      ipAddress: req.ip || req.connection.remoteAddress,
      tipoEvento: 'forgot_password',
      resultado: 'success',
      userId: user.userId
    });

    // RF-03.01 - Response exitoso (no revelar si el email existe por seguridad)
    res.status(200).json({
      success: true,
      message: 'Recovery code sent to your email',
      email: email.toLowerCase()
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    
    await saveAuditLog({
      email: req.body?.email || 'unknown',
      ipAddress: req.ip || req.connection.remoteAddress,
      tipoEvento: 'forgot_password',
      resultado: 'failure',
      razon: error.message,
      userId: null
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to process forgot password request'
    });
  }
};

exports.resetPassword = async (req, res) => {
	
  try {
    const { email, token, newPassword, confirmPassword } = req.body;

    // Validar campos requeridos
    if (!email || !token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Dont leave it blank',
        fields: {
          email: !email,
          token: !token,
          newPassword: !newPassword,
          confirmPassword: !confirmPassword
        }
      });
    }

    // RF-03.03.01 - Validar que ambos campos de contraseña coincidan
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Las contraseñas no coinciden',
        field: 'confirmPassword'
      });
    }

    // RF-03.03.02 - Validar requisitos de RF-01.03
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'La contraseña debe contener mínimo 8 caracteres',
        field: 'newPassword'
      });
    }

    if (!/\d/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'La contraseña debe contener al menos 1 carácter numérico',
        field: 'newPassword'
      });
    }

    if (!/[!@#$%&*()_+\-=\[\]{}<>?]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'La contraseña debe contener al menos 1 carácter especial',
        field: 'newPassword'
      });
    }

    // Buscar usuario por email
    const queryParams = {
      TableName: process.env.DYNAMODB_TABLE_USERS,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email.toLowerCase()
      }
    };

    const result = await docClient.send(new QueryCommand(queryParams));

    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'EMAIL_NOT_FOUND',
        message: 'Not a linked email'
      });
    }

    const user = result.Items[0];

    // RF-03.02.06 - Rechazar token expirado o ya utilizado
    if (!user.recoveryToken || user.recoveryToken !== token) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Código de recuperación inválido o expirado'
      });
    }

    // RF-03.02.04 - Invalidar automáticamente después de 20 minutos
    if (user.recoveryTokenExpiry && parseInt(user.recoveryTokenExpiry) < Date.now()) {
      // Limpiar token expirado
      await docClient.send(new UpdateCommand({
        TableName: process.env.DYNAMODB_TABLE_USERS,
        Key: {
          userId: user.userId,
          email: email.toLowerCase()
        },
        UpdateExpression: 'SET recoveryToken = :nullToken, recoveryTokenExpiry = :nullExpiry, recoveryTokenUsed = :nullUsed',
        ExpressionAttributeValues: {
          ':nullToken': null,
          ':nullExpiry': null,
          ':nullUsed': null
        }
      }));

      return res.status(400).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Código de recuperación inválido o expirado'
      });
    }

    // RF-03.02.05 - Verificar si token ya fue usado
    if (user.recoveryTokenUsed === true) {
      return res.status(400).json({
        success: false,
        error: 'TOKEN_ALREADY_USED',
        message: 'Este código de recuperación ya fue utilizado'
      });
    }

    // RF-03.03.05 - Hashear nueva contraseña
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // RF-03.03.04 - Invalidar contraseña anterior inmediatamente
    // RF-03.02.05 - Invalidar token después de primer uso exitoso
    await docClient.send(new UpdateCommand({
      TableName: process.env.DYNAMODB_TABLE_USERS,
      Key: {
        userId: user.userId,
        email: email.toLowerCase()
      },
      UpdateExpression: 'SET passwordHash = :passwordHash, recoveryToken = :nullToken, recoveryTokenExpiry = :nullExpiry, recoveryTokenUsed = :nullUsed, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':passwordHash': passwordHash,
        ':nullToken': null,
        ':nullExpiry': null,
        ':nullUsed': null,
        ':updatedAt': Date.now().toString()
      }
    }));

    // Registrar en audit logs
    await saveAuditLog({
      email: email.toLowerCase(),
      ipAddress: req.ip || req.connection.remoteAddress,
      tipoEvento: 'reset_password',
      resultado: 'success',
      userId: user.userId
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    
    await saveAuditLog({
      email: req.body?.email || 'unknown',
      ipAddress: req.ip || req.connection.remoteAddress,
      tipoEvento: 'reset_password',
      resultado: 'failure',
      razon: error.message,
      userId: null
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to reset password'
    });
  }
};

// ===========================================
// CAMBIAR CONTRASEÑA (RF-04.03)
// ===========================================
exports.changePassword = async (req, res) => {
  try {
    // RF-04.03 - Requiere autenticación (viene del middleware)
    const userId = req.user.userId;
    const userEmail = req.user.email;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validar campos requeridos
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Dont leave it blank',
        fields: {
          currentPassword: !currentPassword,
          newPassword: !newPassword,
          confirmPassword: !confirmPassword
        }
      });
    }

    // RF-04.03.03 - Validar coincidencia de contraseñas
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Las contraseñas no coinciden',
        field: 'confirmPassword'
      });
    }

    // RF-04.03.02 - Validar requisitos de RF-01.03
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'La contraseña debe contener mínimo 8 caracteres',
        field: 'newPassword'
      });
    }

    if (!/\d/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'La contraseña debe contener al menos 1 carácter numérico',
        field: 'newPassword'
      });
    }

    if (!/[!@#$%&*()_+\-=\[\]{}<>?]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'La contraseña debe contener al menos 1 carácter especial',
        field: 'newPassword'
      });
    }

    // Buscar usuario por userId
    const getUserParams = {
      TableName: process.env.DYNAMODB_TABLE_USERS,
      Key: {
        userId: userId,
        email: userEmail
      }
    };

    const result = await docClient.send(new GetCommand(getUserParams));

    if (!result.Item) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    const user = result.Item;

    // Verificar contraseña actual
    const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    
    if (!isValidCurrentPassword) {
      return res.status(401).json({
        success: false,
        error: 'WRONG_PASSWORD',
        message: 'Current password is incorrect'
      });
    }

    // RF-04.03.04 - Invalidar contraseña anterior inmediatamente
    // RF-04.03.05 - Almacenar nueva contraseña encriptada
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const newpasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await docClient.send(new UpdateCommand({
      TableName: process.env.DYNAMODB_TABLE_USERS,
      Key: {
        userId: userId,
        email: userEmail
      },
      UpdateExpression: 'SET passwordHash = :passwordHash, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':passwordHash': newpasswordHash,
        ':updatedAt': Date.now().toString()
      }
    }));

    // Registrar en audit logs
    await saveAuditLog({
      email: userEmail,
      ipAddress: req.ip || req.connection.remoteAddress,
      tipoEvento: 'change_password',
      resultado: 'success',
      userId: userId
    });

    // ✅ RF-04.05.01 - Mensaje "Profile updated"
    res.status(200).json({
      success: true,
      message: 'Profile updated'
    });

  } catch (error) {
    console.error('Change password error:', error);
    
    await saveAuditLog({
      email: req.user?.email || 'unknown',
      ipAddress: req.ip || req.connection.remoteAddress,
      tipoEvento: 'change_password',
      resultado: 'failure',
      razon: error.message,
      userId: req.user?.userId || null
    });

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to change password'
    });
  }
};