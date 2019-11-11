'use strict'
const uuid = require('uuid/v4')
const AWS = require('aws-sdk')
const sqs = new AWS.SQS({ region: 'us-east-2' })
const dynamoDb = new AWS.DynamoDB.DocumentClient()

const AWS_ACCOUNT = process.env.ACCOUNT_ID
const QUEUE_URL = `https://sqs.us-east-2.amazonaws.com/${AWS_ACCOUNT}/MyQueue`

module.exports.producer = async (event, context) => {
  try {
    const timestamp = new Date().getTime()
    const body = event.body || ''
    const id = uuid()

    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        id,
        json: body,
        createdAt: timestamp,
        updatedAt: timestamp
      }
    }

    await dynamoDb.put(params).promise()

    const sqsParams = {
      MessageBody: id,
      QueueUrl: QUEUE_URL
    }

    const result = await sqs.sendMessage(sqsParams).promise()

    const response = {
      statusCode: 200,
      body: JSON.stringify({
        message: result.MessageId
      })
    }

    return response
  } catch (e) {
    throw e
  }
}

module.exports.consumer = async (event, context) => {
  console.log('it was called')

  await Promise.all(
    event.Records.map(async message => {
      const dynamoId = message.body

      const params = {
        TableName: process.env.DYNAMODB_TABLE,
        Key: {
          id: dynamoId
        }
      }

      const { Item } = await dynamoDb.get(params).promise()

      const payload = JSON.parse(Item.json)

      console.log('payload', payload)
    })
  )

  context.done(null, '')
}
