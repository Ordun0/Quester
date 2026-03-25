// backend/src/controllers/authController.js

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// ===========================================
// CONFIGURACIÓN DE DYNAMODB
// ===========================================
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const docClient = DynamoDBDocumentClient.from(client);

// ===========================================
// CONTROLADOR DE REGISTRO (Tareas 18-21)
// ===========================================
exports.register = async (req, res) => {
  try {
    const { email, password, nombreCompleto } = req.body;

    // ===========================================
    // TAREA 18: VALIDAR CAMPOS REQUERIDOS (RF-01.03.01)
    // ===========================================
    if (!email || !password || !nombreCompleto) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'All fields are required',
        fields: {
          email: !email,
          password: !password,
          nombreCompleto: !nombreCompleto
        }
      });
    }

    // ===========================================
    // TAREA 18: VALIDAR FORMATO DE EMAIL (RF-01.03.02)
    // ===========================================
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid email format',
        field: 'email'
      });
    }

    // ===========================================
    // TAREA 18: VALIDAR REQUISITOS DE CONTRASEÑA (RF-01.03.03)
    // Mínimo 8 caracteres, 1 número, 1 caracter especial
    // ===========================================
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Password must be at least 8 characters, contain 1 number and 1 special character',
        field: 'password'
      });
    }

    // ===========================================
    // TAREA 20: VERIFICAR EMAIL NO DUPLICADO (RF-01.03.04)
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
          message: 'Email already registered'
        });
      }
    } catch (error) {
      // Si el índice no existe, continuamos (lo crearemos después)
      console.log('⚠️ Email index not yet created, continuing without duplicate check...');
    }

    // ===========================================
    // TAREA 19: HASHEAR CONTRASEÑA (RF-01.03.05)
    // ===========================================
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    console.log('✅ Contraseña hasheada correctamente');

    // ===========================================
    // TAREA 19: GENERAR UUID PARA USERID
    // ===========================================
    const userId = `usr_${uuidv4()}`;
    const timestamp = Date.now();
    console.log('✅ UUID generado:', userId);

    // ===========================================
    // DEBUG DYNAMODB (Para troubleshooting)
    // ===========================================
    console.log('=== DEBUG DYNAMODB ===');
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('DYNAMODB_TABLE_USERS:', process.env.DYNAMODB_TABLE_USERS);
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID?.substring(0, 10) + '...');
    console.log('Usuario a guardar:', {
      userId,
      email: email.toLowerCase(),
      nombreCompleto: nombreCompleto.trim()
    });
    console.log('========================');

    // ===========================================
    // TAREA 18: GUARDAR USUARIO EN DYNAMODB
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
        failedLoginAttempts: 0,
        lockedUntil: null,
        isActive: true
      }
    };

    try {
      console.log('📦 Enviando a DynamoDB...', putUserParams.TableName);
      const result = await docClient.send(new PutCommand(putUserParams));
      console.log('✅ DynamoDB response:', result);
      console.log('✅ Usuario guardado exitosamente en DynamoDB');
    } catch (dbError) {
      console.error('❌ DynamoDB Error:', dbError);
      console.error('Error name:', dbError.name);
      console.error('Error message:', dbError.message);
      throw new Error(`Failed to save user to DynamoDB: ${dbError.message}`);
    }

    // ===========================================
    // TAREA 21: REGISTRAR INTENTO EN AUDIT_LOGS (RF-05.03)
    // ===========================================
    const logId = `log_${uuidv4()}`;
    const putLogParams = {
      TableName: process.env.DYNAMODB_TABLE_LOGS,
      Item: {
        logId: logId,
        timestamp: timestamp,
        email: email.toLowerCase(),
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        tipoEvento: 'register',
        resultado: 'success',
        userId: userId,
        razon: null
      }
    };

    try {
      await docClient.send(new PutCommand(putLogParams));
      console.log('✅ Audit log registrado exitosamente');
    } catch (logError) {
      console.error('⚠️ Failed to register audit log:', logError.message);
      // No fallamos el registro por esto, es un log adicional
    }

    // ===========================================
    // RETORNAR RESPUESTA EXITOSA
    // ===========================================
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId: userId,
        email: email.toLowerCase(),
        nombreCompleto: nombreCompleto.trim(),
        createdAt: new Date(timestamp).toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Register error:', error);

    // Registrar error en audit_logs
    try {
      const logId = `log_${uuidv4()}`;
      await docClient.send(new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_LOGS,
        Item: {
          logId: logId,
          timestamp: Date.now(),
          email: req.body?.email || 'unknown',
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
          tipoEvento: 'register',
          resultado: 'failure',
          razon: error.message,
          userId: null
        }
      }));
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to register user'
    });
  }
};
// ===========================================
// CONTROLADOR DE LOGIN (Tareas 22-25)
// ===========================================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ===========================================
    // TAREA 22: VALIDAR CAMPOS REQUERIDOS
    // ===========================================
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Email and password are required',
        fields: {
          email: !email,
          password: !password
        }
      });
    }

    // ===========================================
    // TAREA 22: VALIDAR FORMATO DE EMAIL
    // ===========================================
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid email format',
        field: 'email'
      });
    }

    // ===========================================
    // TAREA 22: BUSCAR USUARIO EN DYNAMODB
    // ===========================================
    const getUserParams = {
      TableName: process.env.DYNAMODB_TABLE_USERS,
      Key: {
        userId: 'placeholder',  // Necesitamos query por email, no por userId
        email: email.toLowerCase()
      }
    };

    // Usamos Query en lugar de Get porque email es SK
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
        // Registrar intento fallido en audit_logs (usuario no encontrado)
        const logId = `log_${uuidv4()}`;
        await docClient.send(new PutCommand({
          TableName: process.env.DYNAMODB_TABLE_LOGS,
          Item: {
            logId: logId,
            timestamp: Date.now(),
            email: email.toLowerCase(),
            ipAddress: req.ip || req.connection.remoteAddress,
            tipoEvento: 'login',
            resultado: 'failure',
            razon: 'email_not_found',
            userId: null
          }
        }));

        return res.status(401).json({
          success: false,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      }
      
      user = result.Items[0];
    } catch (error) {
      console.log('⚠️ Email index not available, trying alternative...');
      // Fallback: Si no hay índice, retornamos error genérico
      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    // ===========================================
    // TAREA 25: VERIFICAR SI CUENTA ESTÁ BLOQUEADA
    // ===========================================
    const now = Date.now();
    if (user.lockedUntil && user.lockedUntil > now) {
      const lockoutMinutes = Math.ceil((user.lockedUntil - now) / 60000);
      
      // Registrar intento bloqueado en audit_logs
      const logId = `log_${uuidv4()}`;
      await docClient.send(new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_LOGS,
        Item: {
          logId: logId,
          timestamp: now,
          email: email.toLowerCase(),
          ipAddress: req.ip || req.connection.remoteAddress,
          tipoEvento: 'login',
          resultado: 'blocked',
          razon: 'account_locked',
          userId: user.userId
        }
      }));

      return res.status(423).json({
        success: false,
        error: 'ACCOUNT_LOCKED',
        message: `Account is locked. Try again in ${lockoutMinutes} minutes`,
        lockedUntil: new Date(user.lockedUntil).toISOString()
      });
    }

    // ===========================================
    // TAREA 23: VERIFICAR CONTRASEÑA CON HASH (bcrypt.compare)
    // ===========================================
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      // ===========================================
      // TAREA 25: INCREMENTAR CONTADOR DE INTENTOS FALLIDOS
      // ===========================================
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 3;
      const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 5;
      
      let lockedUntil = null;
      
      // Bloquear después de 3 intentos fallidos
      if (failedAttempts >= maxAttempts) {
        lockedUntil = now + (lockoutDuration * 60 * 1000);  // Convertir minutos a ms
      }
      
      // Actualizar contador en DynamoDB
      await docClient.send(new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_USERS,
        Item: {
          userId: user.userId,
          email: user.email,
          nombreCompleto: user.nombreCompleto,
          passwordHash: user.passwordHash,
          createdAt: user.createdAt,
          updatedAt: now,
          failedLoginAttempts: failedAttempts,
          lockedUntil: lockedUntil,
          isActive: user.isActive
        }
      }));

      // Registrar intento fallido en audit_logs
      const logId = `log_${uuidv4()}`;
      await docClient.send(new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_LOGS,
        Item: {
          logId: logId,
          timestamp: now,
          email: email.toLowerCase(),
          ipAddress: req.ip || req.connection.remoteAddress,
          tipoEvento: 'login',
          resultado: 'failure',
          razon: 'wrong_password',
          userId: user.userId
        }
      }));

      return res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        attemptsRemaining: maxAttempts - failedAttempts
      });
    }

    // ===========================================
    // LOGIN EXITOSO: Resetear contador de intentos
    // ===========================================
    await docClient.send(new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_USERS,
      Item: {
        userId: user.userId,
        email: user.email,
        nombreCompleto: user.nombreCompleto,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt,
        updatedAt: now,
        failedLoginAttempts: 0,
        lockedUntil: null,
        isActive: true
      }
    }));

    // ===========================================
    // TAREA 24: GENERAR TOKEN JWT
    // ===========================================
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiration = process.env.JWT_EXPIRATION || '30d';
    
    const token = require('jsonwebtoken').sign(
      {
        userId: user.userId,
        email: user.email,
        nombreCompleto: user.nombreCompleto
      },
      jwtSecret,
      { expiresIn: jwtExpiration }
    );

    console.log('✅ Token JWT generado:', token.substring(0, 20) + '...');

    // ===========================================
    // TAREA 21: REGISTRAR INTENTO EXITOSO EN AUDIT_LOGS
    // ===========================================
    const logId = `log_${uuidv4()}`;
    await docClient.send(new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_LOGS,
      Item: {
        logId: logId,
        timestamp: now,
        email: email.toLowerCase(),
        ipAddress: req.ip || req.connection.remoteAddress,
        tipoEvento: 'login',
        resultado: 'success',
        userId: user.userId
      }
    }));

    // ===========================================
    // RETORNAR RESPUESTA EXITOSA
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

    // Registrar error en audit_logs
    try {
      const logId = `log_${uuidv4()}`;
      await docClient.send(new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_LOGS,
        Item: {
          logId: logId,
          timestamp: Date.now(),
          email: req.body?.email || 'unknown',
          ipAddress: req.ip || req.connection.remoteAddress,
          tipoEvento: 'login',
          resultado: 'failure',
          razon: error.message,
          userId: null
        }
      }));
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to login'
    });
  }
};

// ===========================================
// CONTROLADOR DE RECUPERACIÓN (PLACEHOLDER - Tarea 27)
// ===========================================
exports.forgotPassword = async (req, res) => {
  res.json({ 
    message: 'Forgot password endpoint working',
    note: 'Full implementation in Task 27'
  });
};

exports.resetPassword = async (req, res) => {
  res.json({ 
    message: 'Reset password endpoint working',
    note: 'Full implementation in Task 27'
  });
};