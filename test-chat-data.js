const { useApp } = require('./src/lib/appContext.tsx');

function checkChatData() {
  try {
    const { chats, business } = useApp();
    console.log('Business:', business);
    console.log('Chats count:', chats.length);
    console.log('First chat:', chats[0]);
    return { chats, business };
  } catch (error) {
    console.error('Error accessing chat data:', error);
    return { error: error.message };
  }
}
