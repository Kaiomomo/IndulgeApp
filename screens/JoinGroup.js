import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const JoinGroup = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Join Group Screen</Text>
    </View>
  );
};

export default JoinGroup;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
