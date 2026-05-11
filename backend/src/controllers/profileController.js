// backend/src/controllers/profileController.js

const { v4: uuidv4 } = require('uuid');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, DeleteCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

// Configurar cliente de DynamoDB
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const docClient = DynamoDBDocumentClient.from(client);

// ===========================================
// OBTENER PERFIL (Tarea 30)
// ===========================================
exports.getProfile = async (req, res) => {
  try {
    // req.user está disponible gracias al middleware
    const userId = req.user.userId;

    const params = {
      TableName: process.env.DYNAMODB_TABLE_USERS,
      Key: {
        userId: userId,
        email: req.user.email  // Necesario por la estructura PK/SK
      }
    };

    const result = await docClient.send(new GetCommand(params));

    if (!result.Item) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    // Retornar datos sin información sensible
    res.status(200).json({
      success: true,
       data: {
        userId: result.Item.userId,
        email: result.Item.email,
        nombreCompleto: result.Item.nombreCompleto,
        createdAt: new Date(result.Item.createdAt).toISOString(),
        updatedAt: new Date(result.Item.updatedAt).toISOString()
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get profile'
    });
  }
};

// ===========================================
// ACTUALIZAR PERFIL (Tarea 30)
// ===========================================
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { nombreCompleto } = req.body;

    // Validar campos
    if (!nombreCompleto || nombreCompleto.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'nombreCompleto is required'
      });
    }

    const timestamp = Date.now();

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

    // Registrar en audit_logs
    const logId = `log_${uuidv4()}`;
    await docClient.send(new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_LOGS,
      Item: {
        logId: logId,
        timestamp: timestamp.toString(),
        email: req.user.email,
        ipAddress: req.ip || req.connection.remoteAddress,
        tipoEvento: 'profile_update',
        resultado: 'success',
        userId: userId
      }
    }));

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        userId: result.Attributes.userId,
        email: result.Attributes.email,
        nombreCompleto: result.Attributes.nombreCompleto,
        updatedAt: new Date(result.Attributes.updatedAt).toISOString()
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

// ===========================================
// ELIMINAR CUENTA (Tarea 31)
// ===========================================
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;
    const timestamp = Date.now();

    // Eliminar usuario
    const params = {
      TableName: process.env.DYNAMODB_TABLE_USERS,
      Key: {
        userId: userId,
        email: req.user.email
      }
    };

    await docClient.send(new DeleteCommand(params));

    // Registrar en audit_logs
    const logId = `log_${uuidv4()}`;
    await docClient.send(new PutCommand({
      TableName: process.env.DYNAMODB_TABLE_LOGS,
      Item: {
        logId: logId,
        timestamp: timestamp.toString(),
        email: req.user.email,
        ipAddress: req.ip || req.connection.remoteAddress,
        tipoEvento: 'account_delete',
        resultado: 'success',
        userId: userId
      }
    }));

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