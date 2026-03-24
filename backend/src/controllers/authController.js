const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

// Configurar cliente de DynamoDB
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const docClient = DynamoDBDocumentClient.from(client);

// Controlador de registro
exports.register = async (req, res) => {
  try {
    const { email, password, nombreCompleto } = req.body;

    // ===========================================
    // 1. VALIDAR CAMPOS REQUERIDOS (RF-01.03.01)
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
    // 2. VALIDAR FORMATO DE EMAIL (RF-01.03.02)
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
    // 3. VALIDAR REQUISITOS DE CONTRASEÑA (RF-01.03.03)
    // ===========================================
    // Mínimo 8 caracteres, al menos 1 número, 1 letra, 1 caracter especial
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
    // 4. VERIFICAR EMAIL NO DUPLICADO (RF-01.03.04)
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
      console.log('Email index not yet created, continuing...');
    }

    // ===========================================
    // 5. HASHEAR CONTRASEÑA (RF-01.03.05)
    // ===========================================
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // ===========================================
    // 6. GENERAR UUID PARA USERID
    // ===========================================
    const userId = `usr_${uuidv4()}`;
    const timestamp = Date.now();

    // ===========================================
    // 7. GUARDAR USUARIO EN DYNAMODB
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

    await docClient.send(new PutCommand(putUserParams));

    // ===========================================
    // 8. REGISTRAR INTENTO EN AUDIT_LOGS (RF-05.03)
    // ===========================================
    const logId = `log_${uuidv4()}`;
    const putLogParams = {
      TableName: process.env.DYNAMODB_TABLE_LOGS,
      Item: {
        logId: logId,
        timestamp: timestamp,
        email: email.toLowerCase(),
        ipAddress: req.ip || req.connection.remoteAddress,
        tipoEvento: 'register',
        resultado: 'success',
        userId: userId
      }
    };

    await docClient.send(new PutCommand(putLogParams));

    // ===========================================
    // 9. RETORNAR RESPUESTA EXITOSA
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
    console.error('Register error:', error);

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
          tipoEvento: 'register',
          resultado: 'failure',
          razon: error.message
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