var events = [
    {
        id: 1,
        name: 'Jalkapallo @ Brahen kenttä',
        description: 'Vitusti jalkapalloa',
        startTime: new Date(2017, 3, 1),
        duration: 6,
        maxParticipants: 6
        curParticipants: 1,
        coordinates: '60.192059, 24.945831', // Helsinki region
        creatorId: 1,
        adminId: 1,
        reviewDeadline: new Date(2017, 4, 1),
        chatId: 1,
        categoryId: 1
    },
    {
        id: 1,
        name: 'Slush-afterparty',
        description: 'Pöhinöintiä ja ilmasta kaliaa',
        startTime: new Date(2017, 8, 12),
        duration: 8,
        maxParticipants: 120
        curParticipants: 1,
        coordinates: '60.192059, 24.945831', // Helsinki region
        creatorId: 2,
        adminId: 2,
        reviewDeadline: new Date(2017, 9, 12),
        chatId: 2,
        categoryId: 4
    },
    {
        id: 1,
        name: '"Totally-Not-A-Date"-bileet',
        description: 'Täähän _ei siis ole_ Tinder',
        startTime: new Date(2017, 2, 15),
        duration: 4,
        maxParticipants: 3
        curParticipants: 1,
        coordinates: '60.192059, 24.945831', // Helsinki region
        creatorId: 3,
        adminId: 3,
        reviewDeadline: new Date(2017, 3, 15),
        chatId: 3,
        categoryId: 3
    }
];

module.exports = {
    events: events
};
