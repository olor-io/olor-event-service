var events = [
    {
        id: 1,
        name: 'Jalkapallo @ Brahen kenttä',
        description: 'Vitusti jalkapalloa',
        startTime: new Date(2017, 3, 1, 13, 0, 0),
        duration: 6,
        maxParticipants: 6,
        curParticipants: 1,
        coordinates: '60.192059, 24.945831', // Helsinki region
        creatorId: 1,
        adminId: 1,
        reviewDeadline: new Date(2017, 4, 1, 23, 59, 59),
        chatId: 1,
        categoryId: 1
    },
    {
        id: 2,
        name: 'Slush-afterparty',
        description: 'Pöhinöintiä ja ilmasta kaliaa',
        startTime: new Date(2017, 8, 12, 19, 0, 0),
        duration: 8,
        maxParticipants: 120,
        curParticipants: 1,
        coordinates: '60.192059, 24.945831', // Helsinki region
        creatorId: 2,
        adminId: 2,
        reviewDeadline: new Date(2017, 9, 12),
        chatId: 2,
        categoryId: 4
    },
    {
        id: 3,
        name: '"Totally-Not-A-Date"-bileet',
        description: 'Täähän _ei siis ole_ Tinder',
        startTime: new Date(2017, 2, 15),
        duration: 4,
        maxParticipants: 3,
        curParticipants: 1,
        coordinates: '60.192059, 24.945831', // Helsinki region
        creatorId: 3,
        adminId: 3,
        reviewDeadline: new Date(2017, 3, 15),
        chatId: 3,
        categoryId: 3
    },
    {
        id: 4,
        name: '"Totally-Not-A-Date"-bileet',
        description: 'Täähän _ei siis ole_ Tinder',
        startTime: new Date(2017, 2, 15, 18, 0, 0),
        duration: 4,
        maxParticipants: 3,
        curParticipants: 1,
        coordinates: '60.192059, 24.945831', // Helsinki region
        creatorId: 1,
        adminId: 2,
        reviewDeadline: new Date(2017, 3, 15),
        chatId: 4,
        categoryId: 4
    },
    {
        id: 5,
        name: 'Tornin avajaiset',
        description: 'Juhlitaan kovin hienosti. Much VIP, many important',
        startTime: new Date(2017, 2, 15, 22, 0, 0),
        duration: 5,
        maxParticipants: 5,
        curParticipants: 1,
        coordinates: '60.192059, 24.945831', // Helsinki region
        creatorId: 3,
        adminId: 3,
        reviewDeadline: new Date(2017, 3, 15),
        chatId: 5,
        categoryId: 5
    },
    {
        id: 6,
        name: 'Aistiharha jäällä',
        description: 'Vedetään sieniä ja lähdetään luistelee',
        startTime: new Date(2017, 2, 15),
        duration: 3,
        maxParticipants: 3,
        curParticipants: 1,
        coordinates: '60.192059, 24.945831', // Helsinki region
        creatorId: 4,
        adminId: 4,
        reviewDeadline: new Date(2017, 3, 15),
        chatId: 6,
        categoryId: 6
    },
    {
        id: 7,
        name: 'Tekiksen kaatajaiset',
        description: '',
        startTime: new Date(2017, 2, 15, 18, 30, 0),
        duration: 6,
        maxParticipants: 120,
        curParticipants: 1,
        coordinates: '60.192059, 24.945831', // Helsinki region
        creatorId: 7,
        adminId: 7,
        reviewDeadline: new Date(2017, 3, 15),
        chatId: 7,
        categoryId: 7
    },
    {
        id: 8,
        name: 'Bowlarama',
        description: 'Bowling w/ a purpose',
        startTime: new Date(2017, 2, 15, 17, 0, 0),
        duration: 10,
        maxParticipants: 16,
        curParticipants: 3,
        coordinates: '60.192059, 24.945831', // Helsinki region
        creatorId: 8,
        adminId: 8,
        reviewDeadline: new Date(2017, 3, 15),
        chatId: 8,
        categoryId: 4
    }
];

module.exports = {
    events: events
};
